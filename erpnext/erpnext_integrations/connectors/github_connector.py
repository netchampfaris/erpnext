from __future__ import unicode_literals
import frappe
from frappe.data_migration.doctype.data_migration_connector.connectors.base import BaseConnection
from github import Github

class GitHubConnection(BaseConnection):
	def __init__(self, connector):
		self.connector = connector

		self.connection = Github(
			self.connector.username,
			self.get_password()
		)
		self.name_field = 'id'

	def get(self, remote_objectname, fields='"*"', filters=None, start=0, page_length=20):

		if remote_objectname == "Milestone":
			repo = filters.get('repo')
			return self.get_milestones(repo, start, page_length)

		if remote_objectname == "Issue":
			repo = filters.get('repo')
			state = filters.get('state', 'open')
			return self.get_issues(repo, state, start, page_length)

	def get_milestones(self, repo, start=0, page_length=20):
		_repo = self.connection.get_repo(repo)
		return list(_repo.get_milestones()[start:start+page_length])

	def get_issues(self, repo, state, start=0, page_length=20):
		_repo = self.connection.get_repo(repo)
		return list(_repo.get_issues(state=state)[start:start+page_length])

	def insert(self):
		pass

	def update(self):
		pass

	def delete(self):
		pass

def get_connection(connector):
	connection = GitHubConnection(connector)
	return connection
