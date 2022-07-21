import http from 'http'
import { Server } from 'socket.io'
import Jira from './Jira'
import Room from './room'
import RoomManager from './RoomManager'

require('dotenv').config()

const { JIRA_USERNAME, JIRA_PASSWORD } = process.env

const server = http.createServer(async (_, res) => {
	if (!JIRA_USERNAME || !JIRA_PASSWORD) {
		throw new Error('Credentials missing in .env')
	}
	const client = new Jira(JIRA_USERNAME, JIRA_PASSWORD)
	res.write(JSON.stringify(await client.getIssue('VCX-325')))
	res.end()
})

const port = process.env.PORT || 5000
server.listen(port, () => console.log('Server started on port ' + port))

const io = new Server(server, { cors: { origin: '*' } })

io.on('connection', (socket) => {
	console.log(socket.id)
	socket.once('reconnect_player', (context: any) => {
		const room = RoomManager.get(context.meetingId)
		const user = room?.users.find((user) => user.context.userObjectId === context.userObjectId)
		if (room && user) {
			room.reconnectPlayer(socket, user)
		}
	})
	socket.once('join_room', (context: any, name: string) => {
		let room = RoomManager.get(context.meetingId)
		const isOwner = context.frameContext === 'meetingStage'

		if (!room) {
			room = new Room(io, { context, socket, type: 'owner' }, context)
			RoomManager.set(context.meetingId, room)
		}

		if (isOwner) {
			room.setOwner({ context, socket, type: 'owner' })
		} else {
			room.createPlayer(socket, context, name)
		}

		socket.emit('game_state', room.state)
	})
})
