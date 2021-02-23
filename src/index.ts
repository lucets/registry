'use strict'

import WebSocket from 'ws'

import { omit } from './util'

export interface DefaultClientInfo {
  id: string,
  status: 'online' | 'offline',
  createOn: Date,
  lastOnlineOn?: Date,
  socket?: WebSocket
}

export interface DefaultMessage {
  [key: string]: any
}

export interface Registry<
  TClientInfo extends DefaultClientInfo = DefaultClientInfo,
  TMessage extends DefaultMessage = DefaultMessage
> {
  info (id: string): Promise<TClientInfo>,
  exists (id: string): Promise<boolean>,
  create (id: string, info?: Partial<TClientInfo>): Promise<TClientInfo>,
  update (id: string, info: Partial<TClientInfo>): Promise<TClientInfo>,
  delete (id: string): Promise<void>,
  register (id: string, socket: WebSocket): Promise<TClientInfo>,
  unregister (id: string): Promise<void>,
  send (id: string, message: TMessage): Promise<void>
}

export class RegistryError extends Error {}

/**
 * Represents an in-memory registry.
 */
export class LocalRegistry<
  TClientInfo extends DefaultClientInfo = DefaultClientInfo,
  TMessage extends DefaultMessage = DefaultMessage
> implements Registry<TClientInfo> {
  #clients: Map<string, TClientInfo> = new Map()

  public async info (id: string): Promise<TClientInfo> {
    return this.#clients.get(id)
  }

  public async exists (id: string): Promise<boolean> {
    return this.#clients.has(id)
  }

  public async create (id: string, info?: Partial<TClientInfo>): Promise<TClientInfo> {
    if (await this.exists(id)) {
      throw new RegistryError('ID already exists')
    }

    const fullInfo: TClientInfo = omit({
      ...(info ?? {}),
      id,
      status: 'offline',
      createOn: new Date()
    }, 'socket', 'lastOnlineOn')

    this.#clients.set(id, fullInfo)
    return fullInfo
  }

  public async update (id: string, info: Partial<TClientInfo>): Promise<TClientInfo> {
    const fullInfo = await this.info(id)

    if (!fullInfo) {
      throw new RegistryError('ID not found')
    }

    // NOTE: Does this work?
    Object.assign(fullInfo, omit(info, 'status', 'socket', 'createdOn', 'lastOnlineOn'))
    return fullInfo
  }

  public async delete (id: string): Promise<void> {
    if (!await this.exists(id)) {
      throw new RegistryError('ID not found')
    }

    this.#clients.delete(id)
  }

  public async register (id: string, socket: WebSocket): Promise<TClientInfo> {
    const info = await this.info(id)

    if (!info) {
      throw new RegistryError('ID not found')
    } else if (info.status === 'online') {
      throw new RegistryError('Client is online')
    } else if (socket.readyState !== WebSocket.OPEN) {
      throw new RegistryError('Socket not open')
    }

    // NOTE: Does this work??
    info.status = 'online'
    info.lastOnlineOn = new Date()
    info.socket = socket

    return info
  }

  public async unregister (id: string): Promise<void> {
    const info = await this.info(id)

    if (!info) {
      throw new RegistryError('ID not found')
    } else if (info.status !== 'online') {
      throw new RegistryError('Client is offline')
    }

    info.status = 'offline'
    info.lastOnlineOn = new Date()
    delete info.socket
  }

  public async send (id: string, message: TMessage): Promise<void> {
    const info = await this.info(id)

    if (!info) {
      throw new RegistryError('ID not found')
    } else if (info.status === 'offline') {
      throw new RegistryError('Client is offline')
    } else if (!info.socket) {
      throw new RegistryError('Missing socket')
    } else if (info.socket.readyState !== WebSocket.OPEN) {
      throw new RegistryError('Socket not open')
    }

    return new Promise<void>((resolve, reject) => {
      info.socket.send(JSON.stringify(message), err => {
        if (err) return reject(err)
        resolve()
      })
    })
  }
}
