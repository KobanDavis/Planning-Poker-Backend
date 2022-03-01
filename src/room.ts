import { Server, Socket } from 'socket.io'

export enum State {
	LOBBY = 'lobby',
	PLANNING = 'planning',
	INGAME = 'ingame',
	POSTGAME = 'postgame'
}

export interface User {
	type: 'player' | 'owner'
	socket: Socket
	context: any
	name?: string
}

export interface Card {
	id: string
	value: number | string
	name?: string
}

class Room {
	public state: State = State.LOBBY
	public users: User[] = []
	public cards: Map<string, Card> = new Map([
		['test', { id: 'test', value: 5, name: 'Test 1' }],
		['test2', { id: 'test2', value: 7, name: 'Test 2' }]
	])

	constructor(private _io: Server, private _owner: User, private _context: any) {
		this._subscribeOwnerEvents(this._owner.socket)
		this._emitUsers()
		this._emitCards()
	}

	private _emitToRoom(ev: string, data: any) {
		this._io.to(this._context.meetingId).emit(ev, data)
	}

	public setOwner(owner: User) {
		console.log('setOwner', owner.context.upn, owner.context.meetingId)

		if (!this._owner) {
			this._owner = owner
		} else {
			this._owner.socket = owner.socket
		}
		this._owner.socket.join(this._context.meetingId)
		this._subscribeOwnerEvents(this._owner.socket)
		this._emitCards()
		this._emitUsers()
	}

	private _emitUsers() {
		this._emitToRoom(
			'users',
			this.users.map((user) => {
				const newUser = { ...user } as any
				delete newUser.socket
				return newUser
			})
		)
	}

	private _emitCards() {
		this._emitToRoom('cards', Array.from(this.cards.values()))
	}

	private _emitGameState() {
		console.log('emit_state', this.state)

		this._emitToRoom('game_state', this.state)
	}

	private _subscribeOwnerEvents(socket: Socket) {
		socket.on('get_users', () => this._emitUsers())
		socket.on('new_game', () => this._startNewGame())
		socket.on('game_state', (state: State) => {
			this.state = state
			if (state === State.LOBBY) {
				this.cards.clear()
			}
			this._emitToRoom('game_state', state)
		})
	}

	private _startNewGame() {
		this.cards.clear()
		this.state = State.PLANNING
		// ordering is important
		this._emitGameState()
		this._emitCards()
	}

	public reconnectPlayer(socket: Socket, user: any) {
		user.socket = socket
		user.socket.join(user.context.meetingId)
		socket.on('card', (data) => {
			this.cards.set(data.id, data)
			this._emitCards()
		})
		console.log('reconnect', user.name, user.context.meetingId)
		this._emitUsers()
		this._emitCards()
		socket.emit('game_state', this.state)
	}

	public createPlayer(socket: Socket, context: any, name: string) {
		socket.join(context.meetingId)
		socket.on('card', (data) => {
			this.cards.set(data.id, data)
			this._emitCards()
		})
		const user: User = { type: 'player', socket, context, name }

		console.log('create', user.name, user.context.meetingId)
		this.users.push(user)
		this._emitUsers()
		this._emitCards()
	}
}

export default Room
