// Copyright (c) 2016, ESS LLP and contributors
// For license information, please see license.txt
frappe.provide("erpnext.queries");
frappe.ui.form.on('Patient Appointment', {
	refresh: function(frm) {
		frm.trigger("clear_render_availability_view");
		frm.set_query("patient", function () {
			return {
				filters: {"disabled": 0}
			}
		});
		if(frappe.user.has_role("IP Physician")||frappe.user.has_role("OP Physician")){
			if(frm.doc.patient){
				frm.add_custom_button(__('Medical Record'), function() {
					frappe.route_options = {"patient": frm.doc.patient}
					frappe.set_route("medical_record");
				 },__("View") );
			};
			if(frm.doc.status == "Open"){
				 frm.add_custom_button(__('Cancel'), function() {
	 				btn_update_status(frm, "Cancelled");
	 			 } );
			};
			if(frm.doc.status == "Scheduled" && !frm.doc.__islocal){
				 frm.add_custom_button(__('Cancel'), function() {
	 				btn_update_status(frm, "Cancelled");
	 			 } );
			};
			if(frm.doc.status == "Pending"){
				frm.add_custom_button(__('Set Open'), function() {
					btn_update_status(frm, "Open");
				 } );
				 frm.add_custom_button(__('Cancel'), function() {
	 				btn_update_status(frm, "Cancelled");
	 			 } );
			};
		}

		if(!frm.doc.__islocal && (frappe.user.has_role("IP Physician")||frappe.user.has_role("OP Physician")) && frm.doc.status == "Open"){
			frm.add_custom_button(__("Consultation"),function(){
				btn_create_consultation(frm);
			},"Create");
		}
		if(!frm.doc.__islocal && (frappe.user.has_role("Nursing User")||frappe.user.has_role("IP Physician")||frappe.user.has_role("OP Physician")) && frm.doc.status == "Open"){
			frm.add_custom_button(__('Vital Signs'), function() {
				btn_create_vital_signs(frm);
			 },"Create");
		}

		if(!frm.doc.__islocal){
			if(frm.doc.invoiced == '1'){
				frm.add_custom_button(__('Invoice'), function() {
					frappe.set_route("Form", "Sales Invoice", frm.doc.invoice);
				 },__("View") );
			}
			else if(frm.doc.status != "Cancelled"){
				frm.add_custom_button(__('Invoice'), function() {
					btn_invoice_consultation(frm);
				 },__("Create") );
			}
		};
		if(frm.doc.__islocal){
			frm.add_custom_button(__('By Physician'), function() {
				check_availability_by_physician(frm);
			 },__("Check Availability") );
			frm.add_custom_button(__('By Department'), function() {
				check_availability_by_dept(frm);
			 },__("Check Availability") );
		};
	},
	onload:function(frm){
		if(frm.doc.__islocal){
			frappe.model.set_value(frm.doctype,frm.docname,"appointment_time", null);
		}

	},
	appointment_date: function(frm) {
		if(!(frm.doc.appointment_date && frm.doc.physician)) {
			// clear the availability view
			frm.trigger("clear_render_availability_view");
			frappe.throw(__("Please select Appointment Date and Physician"));
		}
		frappe.call({
			method: "erpnext.healthcare.doctype.patient_appointment.patient_appointment.get_availability_data",
			args: {
				date: frm.doc.appointment_date,
				physician: frm.doc.physician
			},
			callback: r => {
				const values = r.message;
				erpnext.render_availability_view(frm, values);

				frm.time_limit_start = values.available_slots
					.map(slot => slot.from_time)
					.reduce((prev, curr) => {
						const prev_time = frappe.datetime.parse_time(prev);
						const curr_time = frappe.datetime.parse_time(curr);
						return prev_time < curr_time ? prev_time : curr_time;
					});
				frm.time_limit_end = values.available_slots
					.map(slot => slot.to_time)
					.reduce((prev, curr) => {
						const prev_time = frappe.datetime.parse_time(prev);
						const curr_time = frappe.datetime.parse_time(curr);
						return prev_time > curr_time ? prev_time : curr_time;
					});

				frm.trigger("limit_appointment_time_picker");
			}
		})
		.fail(() => frm.trigger("clear_render_availability_view"))
		// frappe.model.set_value(frm.doctype,frm.docname, 'start_dt', new Date(frm.doc.appointment_date + ' ' + frm.doc.appointment_time))
	},
	appointment_time: function(frm){
		frappe.model.set_value(frm.doctype,frm.docname, 'start_dt', new Date(frm.doc.appointment_date + ' ' + frm.doc.appointment_time))
	},
	limit_appointment_time_picker: function(frm) {
		console.log('asdf');
		frm.time_limit_start = frappe.datetime.parse_time(frm.time_limit_start);
		frm.time_limit_end = frappe.datetime.parse_time(frm.time_limit_end);

		frm.fields_dict.appointment_time.datepicker.update({
			minHours: frm.time_limit_start.get('hour'),
			maxHours: frm.time_limit_end.get('hour'),
			minMinutes: frm.time_limit_start.get('minute'),
			maxMinutes: frm.time_limit_end.get('minute')
		});
	},
	clear_render_availability_view: function(frm) {
		frm.fields_dict.availability_view.$wrapper.html("");
	}
});

erpnext.render_availability_view = function(frm, { appointments, available_slots }) {

	const start = frappe.datetime.parse_time("00:00:00");
	const scale = 24 * 60;

	const slots = available_slots.map(slot => {
		const from_time = frappe.datetime.parse_time(slot.from_time);
		const to_time = frappe.datetime.parse_time(slot.to_time);

		const offset = from_time.diff(start, 'minute');
		const duration = to_time.diff(from_time, 'minute');

		return {
			left: offset / scale * 100,
			width: duration / scale * 100
		}
	});

	const booked_slots = appointments.map(slot => {
		const from_time = frappe.datetime.parse_time(slot.appointment_time);
		const offset = from_time.diff(start, 'minute');
		const duration = +slot.duration; // convert to number

		return {
			left: offset / scale * 100,
			width: duration / scale * 100
		}
	});

	const availability_view = `
		<div class="availability-view">
			${slots.map(slot => `
				<div class="available-slot" style="left: ${slot.left}%; width: ${slot.width}%">
				</div>
			`).join("")}
			
			${booked_slots.map(slot => `
				<div class="booked-slot" style="left: ${slot.left}%; width: ${slot.width}%">
				</div>
			`).join("")}
		<div>
	`;

	frm.fields_dict.availability_view.$wrapper.html(availability_view);
}

var btn_create_consultation = function(frm){
	var doc = frm.doc;
	frappe.call({
		method:"erpnext.healthcare.doctype.patient_appointment.patient_appointment.create_consultation",
		args: {appointment: doc.name},
		callback: function(data){
			if(!data.exc){
				var doclist = frappe.model.sync(data.message);
				frappe.set_route("Form", doclist[0].doctype, doclist[0].name);
			}
		}
	});
}

var btn_create_vital_signs = function (frm) {
	if(!frm.doc.patient){
		frappe.throw("Please select patient")
	}
	frappe.route_options = {
		"patient": frm.doc.patient,
	}
	frappe.new_doc("Vital Signs")
}

var check_availability_by_dept = function(frm){
	if(frm.doc.department && frm.doc.appointment_date){
		frappe.call({
			method: "erpnext.healthcare.doctype.patient_appointment.patient_appointment.check_availability_by_dept",
			args: {department: frm.doc.department, date: frm.doc.appointment_date, time: frm.doc.appointment_time},
			callback: function(r){
				if(r.message) show_availability(frm, r.message)
				else msgprint("Error in checking availability");
			}
		});
	}else{
		msgprint("Please select Department and Date");
	}
}

var check_availability_by_physician = function(frm){
	if(frm.doc.physician && frm.doc.appointment_date){
		frappe.call({
			method: "erpnext.healthcare.doctype.patient_appointment.patient_appointment.check_availability_by_physician",
			args: {physician: frm.doc.physician, date: frm.doc.appointment_date, time: frm.doc.appointment_time},
			callback: function(r){
				show_availability(frm, r.message)
			}
		});
	}else{
		msgprint("Please select Physician and Date");
	}
}


var show_availability = function(frm, result){
	var d = new frappe.ui.Dialog({
		title: __("Patient Appointment Availability (Time - Token)"),
		fields: [
			{
				fieldtype: "HTML", fieldname: "availability"
			}
		]
	});
	var html_field = d.fields_dict.availability.$wrapper;
	html_field.empty();
	var list = ''
	$.each(result, function(i, v) {
		if(!v[0]){
			$(repl('<div class="col-xs-12" style="padding-top:20px;" >%(physician)s not available</div></div>', {physician: i})).appendTo(html_field);
			return
		}
		if(v[0]["msg"]){
			var message = $(repl('<div class="col-xs-12" style="padding-top:20px;" >%(msg)s</div></div>', {msg: v[0]["msg"]})).appendTo(html_field);
			return
		}
		$(repl('<div class="col-xs-12" style="padding-top:20px;"><b> %(physician)s</b></div>', {physician: i})).appendTo(html_field);
		$.each(result[i], function(x, y){
			if(y["msg"]){
				var message = $(repl('<div class="col-xs-12" style="padding-top:12px; text-align:center;">%(msg)s</div></div>', {msg: y["msg"]})).appendTo(html_field);
				return
			}
			else{
				var row = $(repl('<div class="col-xs-12" style="padding-top:12px; text-align:center;" ><div class="col-xs-4"> %(start)s </div><div class="col-xs-4"> %(token)s </div><div class="col-xs-4"><a data-start="%(start)s" data-end="%(end)s" data-token="%(token)s" data-physician="%(physician)s"  href="#"><button class="btn btn-default btn-xs">Book</button></a></div></div>', {start: y["start"], end: y["end"], token: y["token"], physician: i})).appendTo(html_field);
			}
			row.find("a").click(function() {
				var date_obj = frappe.datetime.str_to_obj($(this).attr("data-start"))
				frm.doc.appointment_time = date_obj.toLocaleTimeString();
				frm.doc.physician = $(this).attr("data-physician");
				frm.doc.start_dt = $(this).attr("data-start");
				frm.doc.end_dt = $(this).attr("data-end");
				frm.doc.token = $(this).attr("data-token");
				frm.set_df_property("patient", "read_only", 1);
				frm.set_df_property("token", "read_only", 1);
				frm.set_df_property("appointment_type", "read_only", 1);
				frm.set_df_property("physician", "read_only", 1);
				frm.set_df_property("ref_physician", "read_only", 1);
				frm.set_df_property("department", "read_only", 1);
				frm.set_df_property("appointment_date", "read_only", 1);
				frm.set_df_property("appointment_time", "hidden", 0);
				frm.set_df_property("appointment_time", "read_only", 1);
				refresh_field("physician");refresh_field("token");refresh_field("start_dt");
				refresh_field("appointment_time");refresh_field("end_dt")
				d.hide();
				return false;
			});
		})

	});
	d.show();
}

var btn_update_status = function(frm, status){
	var doc = frm.doc;
	frappe.call({
		method:
		"erpnext.healthcare.doctype.patient_appointment.patient_appointment.update_status",
		args: {appointmentId: doc.name, status:status},
		callback: function(data){
			if(!data.exc){
				cur_frm.reload_doc();
			}
		}
	});
}

var btn_invoice_consultation = function(frm){
	var doc = frm.doc;
	frappe.call({
		method:
		"erpnext.healthcare.doctype.patient_appointment.patient_appointment.create_invoice",
		args: {company: doc.company, patient: doc.patient, appointments: [doc.name] },
		callback: function(data){
			if(!data.exc){
				if(data.message){
					frappe.set_route("Form", "Sales Invoice", data.message);
				}
				cur_frm.reload_doc();
			}
		}
	});
}

frappe.ui.form.on("Patient Appointment", "physician",
    function(frm) {
	if(frm.doc.physician){
		frappe.call({
		    "method": "frappe.client.get",
		    args: {
		        doctype: "Physician",
		        name: frm.doc.physician
		    },
		    callback: function (data) {
				frappe.model.set_value(frm.doctype,frm.docname, "department",data.message.department)
		    }
		})
	}
});

frappe.ui.form.on("Patient Appointment", "patient",
    function(frm) {
        if(frm.doc.patient){
		frappe.call({
		    "method": "frappe.client.get",
		    args: {
		        doctype: "Patient",
		        name: frm.doc.patient
		    },
		    callback: function (data) {
					age = null
					if(data.message.dob){
						age = calculate_age(data.message.dob)
					}else if (data.message.age){
						age = data.message.age
						if(data.message.age_as_on){
							age = age+" as on "+data.message.age_as_on
						}
					}
					frappe.model.set_value(frm.doctype,frm.docname, "patient_age", age)
		    }
		})
	}
});

var calculate_age = function(birth) {
  ageMS = Date.parse(Date()) - Date.parse(birth);
  age = new Date();
  age.setTime(ageMS);
  years =  age.getFullYear() - 1970
  return  years + " Year(s) " + age.getMonth() + " Month(s) " + age.getDate() + " Day(s)"
}
