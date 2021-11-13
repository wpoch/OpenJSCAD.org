import { Jsx6 } from './core'

export function setAttrBoolean (obj, attr, value) {
  if (obj) {
    if (obj.setAttribute) {
      if (value) {
        if (!obj.hasAttribute(attr)) obj.setAttribute(attr, attr)
      } else {
        if (obj.hasAttribute(attr)) obj.removeAttribute(attr)
      }
    } else if (obj instanceof Jsx6) {
      setAttrBoolean(obj.el, attr, value)
    } else if (typeof obj === 'object') {
      for (const p in obj) {
        setAttrBoolean(obj[p], attr, p === value)
      }
    }
  }
}
