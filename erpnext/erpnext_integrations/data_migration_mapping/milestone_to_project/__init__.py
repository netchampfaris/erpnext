
def pre_process(milestone):
	return {
		'id': milestone.id,
		'title': milestone.title,
		'description': milestone.description,
		'status': milestone.state.title()
	}
