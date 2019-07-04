context('Manufacturing', () => {
	before(() => {
		cy.login();
		cy.visit('/desk');
	});

	it('completes setup wizard', () => {
		function click_next_btn() {
			cy.get('.next-btn').click();
		}

		function handle_complete_btn(first_try) {
			if (!first_try) {
				cy.get('button:contains("Retry")').click();
			}
			cy.get('.complete-btn').click();
			cy.wait('@setup-complete').then(xhr => {
				if (xhr.response.status != 200) {
					handle_complete_btn();
				} else {
					cy.location().should('be', '/desk');
				}
			})
		}
		cy.server();
		cy.route('POST', '/api/method/frappe.desk.page.setup_wizard.setup_wizard.setup_complete')
			.as('setup-complete');

		click_next_btn();
		cy.fill_field('country', 'India', 'Select');
		click_next_btn();
		cy.get('label:contains("Manufacturing")').click();
		click_next_btn();
		cy.fill_field('company_name', 'TennisMart');
		cy.fill_field('company_abbr', 'TM');
		click_next_btn();
		cy.fill_field('company_tagline', 'Build Tools');
		cy.fill_field('bank_account', 'Test Bank');

		handle_complete_btn(true);
	});
});
