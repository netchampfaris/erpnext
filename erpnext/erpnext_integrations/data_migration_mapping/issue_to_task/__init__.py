import frappe
from markdown2 import markdown

def pre_process(issue):
	project_name = ''
	if issue.milestone:
		project_name = frappe.db.get_value(
			'Project', filters={'project_name': issue.milestone})

	state = 'Open' if issue.state == 'open' else 'Closed'

	body = markdown(issue.body or '')

	return {
		'id': issue.id,
		'title': issue.title,
		'body': body,
		'milestone': project_name,
		'state': state
	}
