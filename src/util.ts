'use strict'

export function omit (obj: any, ...keys: string[]) {
  const newObj: any = {}

  Object.keys(obj).forEach(key => {
    if (keys.includes(key)) {
      newObj[key] = obj[key]
    }
  })

  return newObj
}
