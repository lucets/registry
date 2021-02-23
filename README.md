# @lucets/registry

Register WebSocket clients and manage their info.

The main component is a `Registry` interface which can be implemented
in your own registries.
The accompanying `LocalRegistry` is an in-memory registry which can be
used as a reference implementation.

Developed for use in combination with [@lucets/luce](https://github.com/lucets/luce),
but is in no way dependent on it.

## Install

```
npm i @lucets/registry
```

## Example

An example in combination with luce.

```ts
'use strict'

import Application, { WebSocketError } from '@lucets/luce'
import { LocalRegistry } from '@lucets/registry'
import { nanoid } from 'nanoid/async'

const app = new Application()
const registry = new LocalRegistry()

// Set an ID
// Set a flag to delete the peer from the
// registry once the connection has closed
app.useUpgrade('pre', async (ctx, next) => {
  ctx.state.id = await nanoid()
  ctx.state.deleteOnClose = true
  return next()
})

app.useUpgrade('post', async (ctx, next) => {
  // Create the ID if it doesn't exist yet
  if (!await registry.exists(ctx.state.id)) {
    await registry.create(ctx.state.id)
  }

  // Register the socket with the registry
  await registry.register(ctx.state.id, ctx.socket)

  ctx.socket.once('close', async () => {
    // Unregister the ID
    await registry.unregister(ctx.state.id)
  
    // Delete the ID if the flag is set
    if (ctx.state.deleteOnClose) {
      await registry.delete(ctx.state.id)
    }
  })

  return next()
})

app.useMessage(async (message, ctx, next) => {
  // Update client info
  if (message.cmd === 'update-info') {
    await registry.update(ctx.state.id, message.info)
  }
})
```

## License

Copyright 2021 [Michiel van der Velde](https://michielvdvelde.nl).

This software is licensed under [the MIT License](LICENSE).
