export function toBinding (obj, prop, defBind, target) {
  let propBind = obj[prop]
  if (!propBind) {
    console.error(prop + ' binding not provided for', target)
  }
  if (typeof propBind === 'string') {
    propBind = defBind[propBind]
    obj[prop] = propBind
  }
  return propBind
}
