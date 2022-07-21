class Jira {
	private static BASE_URL = 'https://mondago.atlassian.net/rest/api/2'
	private _headers: Headers = new Headers()

	constructor(email: string, password: string) {
		const auth = Buffer.from(`${email}:${password}`).toString('base64')
		this._headers.set('Authorization', `Basic ${auth}`)
		this._headers.set('Content-Type', 'application/json')
	}

	public async getIssue(id: string) {
		const res = await fetch(`${Jira.BASE_URL}/issue/${id}`, { method: 'GET', headers: this._headers })
		const data = await res.json()

		if (data.errors) {
			// do something probably
			throw new Error(JSON.stringify(data.errors))
		}

		return {
			storyPoints: data.fields['customfield_10020'],
			summary: `${data.key} ${data.fields.summary}`,
			reporter: data.fields.reporter.displayName,
			icons: {
				type: data.fields.issuetype.iconUrl,
				priority: data.fields.priority.iconUrl,
				reporter: data.fields.reporter.avatarUrls['48x48']
			}
		}
	}

	public async editIssueStoryPoints(id: string, value: number | null) {
		const body = {
			fields: {
				// name of the story point field
				customfield_10020: value
			}
		}

		const res = await fetch(`${Jira.BASE_URL}/issue/${id}`, {
			method: 'PUT',
			headers: this._headers,
			body: JSON.stringify(body)
		})

		const data = await res.text()
		return data
	}
}

export default Jira
