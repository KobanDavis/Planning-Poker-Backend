import http from 'http'
import { Server } from 'socket.io'
import Room from './room'
import RoomManager from './RoomManager'

require('dotenv').config()

const server = http.createServer((_, res) => {
	res.write('Online')
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
