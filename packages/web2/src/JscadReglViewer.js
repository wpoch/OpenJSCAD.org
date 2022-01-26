const { prepareRender, drawCommands, cameras, controls } = require('./jscad-regl-renderer.min.js')

const rotateSpeed = 0.002
const panSpeed = 1
const zoomSpeed = 0.08
let rotateDelta = [0, 0]
let panDelta = [0, 0]
let zoomDelta = 0
let updateRender = true
let orbitControls, renderOptions, gridOptions, axisOptions, renderer

const entities = []

function createContext (canvas, contextAttributes) {
  function get (type) {
    try {
      return { gl: canvas.getContext(type, contextAttributes), type }
    } catch (e) {
      return null
    }
  }
  return (
    get('webgl2') ||
    get('webgl') ||
    get('experimental-webgl') ||
    get('webgl-experimental')
  )
}

const state = {}
let perspectiveCamera

const startRenderer = ({ canvas, cameraPosition, cameraTarget, axis = {}, grid = {} }) => {
  // ********************
  // Renderer configuration and initiation.
  // ********************

  perspectiveCamera = cameras.perspective
  orbitControls = controls.orbit

  state.canvas = canvas
  // prepare the camera
  state.camera = Object.assign({}, perspectiveCamera.defaults)
  if (cameraPosition) state.camera.position = cameraPosition
  if (cameraTarget) state.camera.target = cameraTarget

  resize({ width: canvas.width, height: canvas.height })

  // prepare the controls
  state.controls = orbitControls.defaults

  const { gl, type } = createContext(canvas)
  // prepare the renderer
  const setupOptions = {
    glOptions: { gl }
  }
  if (type == 'webgl') {
    setupOptions.glOptions.optionalExtensions = ['oes_element_index_uint']
  }
  renderer = prepareRender(setupOptions)

  gridOptions = {
    visuals: {
      drawCmd: 'drawGrid',
      show: grid.show || grid.show === undefined,
      color: grid.color || [0, 0, 0, 1],
      subColor: grid.subColor || [0, 0, 1, 0.5],
      fadeOut: false,
      transparent: true
    },
    size: grid.size || [200, 200],
    ticks: grid.ticks || [10, 1]
  }

  axisOptions = {
    visuals: {
      drawCmd: 'drawAxis',
      show: axis.show || axis.show === undefined
    },
    size: axis.size || 100
  }

  // assemble the options for rendering
  renderOptions = {
    camera: state.camera,
    drawCommands: {
      drawAxis: drawCommands.drawAxis,
      drawGrid: drawCommands.drawGrid,
      drawLines: drawCommands.drawLines,
      drawMesh: drawCommands.drawMesh
    },
    // define the visual content
    entities: [
      gridOptions,
      axisOptions,
      ...entities
    ]
  }
  // the heart of rendering, as themes, controls, etc change

  updateView()
}

let renderTimer
const tmFunc = typeof requestAnimationFrame === 'undefined' ? setTimeout : requestAnimationFrame

function updateView (delay = 8) {
  if (renderTimer || !renderer) return
  renderTimer = tmFunc(updateAndRender, delay)
}

const doRotatePanZoom = () => {
  if (rotateDelta[0] || rotateDelta[1]) {
    const updated = orbitControls.rotate({ controls: state.controls, camera: state.camera, speed: rotateSpeed }, rotateDelta)
    state.controls = { ...state.controls, ...updated.controls }
    rotateDelta = [0, 0]
  }

  if (panDelta[0] || panDelta[1]) {
    const updated = orbitControls.pan({ controls: state.controls, camera: state.camera, speed: panSpeed }, panDelta)
    state.controls = { ...state.controls, ...updated.controls }
    panDelta = [0, 0]
    state.camera.position = updated.camera.position
    state.camera.target = updated.camera.target
  }

  if (zoomDelta) {
    const updated = orbitControls.zoom({ controls: state.controls, camera: state.camera, speed: zoomSpeed }, zoomDelta)
    state.controls = { ...state.controls, ...updated.controls }
    zoomDelta = 0
  }
}

const updateAndRender = (timestamp) => {
  renderTimer = null
  doRotatePanZoom()

  const updates = orbitControls.update({ controls: state.controls, camera: state.camera })
  state.controls = { ...state.controls, ...updates.controls }
  if (state.controls.changed) updateView(16) // for elasticity in rotate / zoom

  state.camera.position = updates.camera.position
  perspectiveCamera.update(state.camera)
  renderOptions.entities = [
    gridOptions,
    axisOptions,
    ...entities
  ]
  const time = Date.now()
  renderer(renderOptions)
  if (updateRender) {
    console.log(updateRender, ' first render', Date.now() - time)
    updateRender = ''
  }
}

function resize ({ width, height }) {
  state.canvas.width = width
  state.canvas.height = height
  perspectiveCamera.setProjection(state.camera, state.camera, { width, height })
  perspectiveCamera.update(state.camera, state.camera)
  updateView()
}

const handlers = {
  pan: ({ dx, dy }) => {
    panDelta[0] += dx
    panDelta[1] += dy
    updateView()
  },
  resize,
  rotate: ({ dx, dy }) => {
    rotateDelta[0] -= dx
    rotateDelta[1] -= dy
    updateView()
  },
  zoom: ({ dy }) => {
    zoomDelta += dy
    updateView()
  },
  showAxes: ({ show }) => {
    axisOptions.visuals.show = show
    updateView()
  },
  showGrid: ({ show }) => {
    gridOptions.visuals.show = show
    updateView()
  }
}

function receiveCmd (cmd) {
  const fn = handlers[cmd.action]
  if (!fn) {
    throw new Error('no handler for type: ' + cmd.action)
  }
  fn(cmd)
}

function sendCmd (cmd) {
  receiveCmd(cmd)
}

let lastX = 0
let lastY = 0

let pointerDown = false
let canvas

const moveHandler = (ev) => {
  if (!pointerDown) return
  const cmd = {
    dx: lastX - ev.pageX,
    dy: ev.pageY - lastY
  }

  const shiftKey = (ev.shiftKey === true) || (ev.touches && ev.touches.length > 2)
  cmd.action = shiftKey ? 'pan' : 'rotate'
  sendCmd(cmd)

  lastX = ev.pageX
  lastY = ev.pageY

  ev.preventDefault()
}
const downHandler = (ev) => {
  pointerDown = true
  lastX = ev.pageX
  lastY = ev.pageY
  canvas.setPointerCapture(ev.pointerId)
  ev.preventDefault()
}

const upHandler = (ev) => {
  pointerDown = false
  canvas.releasePointerCapture(ev.pointerId)
  ev.preventDefault()
}

const wheelHandler = (ev) => {
  sendCmd({ action: 'zoom', dy: ev.deltaY })
  ev.preventDefault()
}

export default function JscadReglViewer (el, { showAxes = true, showGrid = true } = {}) {
  canvas = document.createElement('CANVAS')
  el.appendChild(canvas)
  startRenderer({ canvas, axis: { show: showAxes }, grid: { show: showGrid } })

  canvas.onpointermove = moveHandler
  canvas.onpointerdown = downHandler
  canvas.onpointerup = upHandler
  canvas.onwheel = wheelHandler

  const resizeObserver = new ResizeObserver(entries => {
    const rect = entries[0].contentRect
    resize(rect)
  })
  resizeObserver.observe(el)

  return { sendCmd }
}
