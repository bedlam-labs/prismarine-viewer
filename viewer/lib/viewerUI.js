/* global THREE */
const TWEEN = require('@tweenjs/tween.js')

const STYLES = `
.vui-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  pointer-events: none; z-index: 100;
  font-family: 'Segoe UI', system-ui, sans-serif; font-size: 12px;
}

.vui-topbar {
  position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 4px;
  background: rgba(16,16,16,0.90); border: 1px solid #2e2e2e; border-radius: 8px;
  padding: 5px; pointer-events: all; white-space: nowrap;
}
.vui-mode-btn {
  background: transparent; border: 1px solid transparent;
  color: #888; padding: 5px 16px; border-radius: 5px;
  cursor: pointer; font-size: 12px; font-weight: 500; letter-spacing: 0.3px;
  transition: color 0.12s, background 0.12s, border-color 0.12s;
}
.vui-mode-btn:hover { color: #ddd; background: rgba(255,255,255,0.07); }
.vui-mode-btn.vui-active { color: #4a9eff; border-color: rgba(74,158,255,0.45); background: rgba(74,158,255,0.1); }
.vui-mode-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.vui-panel {
  position: absolute; top: 58px;
  background: rgba(15,15,15,0.92); border: 1px solid #272727; border-radius: 8px;
  padding: 10px 12px; min-width: 190px; pointer-events: all; user-select: none;
}
.vui-panel-left  { left: 10px; }
.vui-panel-right { right: 10px; }
.vui-panel-title {
  margin: 0 0 8px 0; font-size: 10px; font-weight: 600;
  color: #585858; text-transform: uppercase; letter-spacing: 0.9px;
  display: flex; justify-content: space-between; align-items: center;
}
.vui-collapse-btn { cursor: pointer; color: #444; font-size: 15px; line-height: 1; padding-left: 6px; }
.vui-collapse-btn:hover { color: #aaa; }
.vui-panel.collapsed .vui-panel-body { display: none; }

.vui-section {
  font-size: 10px; font-weight: 600; color: #484848;
  text-transform: uppercase; letter-spacing: 0.6px;
  margin: 9px 0 5px; padding-bottom: 3px; border-bottom: 1px solid #1e1e1e;
}
.vui-section:first-child { margin-top: 0; }
.vui-row {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 6px; gap: 6px;
}
.vui-row:last-child { margin-bottom: 0; }
.vui-lbl { font-size: 11px; color: #777; white-space: nowrap; min-width: 54px; }
input.vui-range {
  -webkit-appearance: none; flex: 1; height: 3px;
  background: #252525; border-radius: 2px; outline: none; cursor: pointer; min-width: 0;
}
input.vui-range::-webkit-slider-thumb {
  -webkit-appearance: none; width: 11px; height: 11px;
  background: #4a9eff; border-radius: 50%; cursor: pointer;
}
input.vui-num {
  background: rgba(255,255,255,0.04); border: 1px solid #282828; border-radius: 4px;
  color: #ccc; font-size: 11px; padding: 2px 5px; width: 38px; text-align: right; flex-shrink: 0;
}
input.vui-num:focus { outline: none; border-color: #4a9eff; }
input.vui-color {
  border: none; background: none; width: 22px; height: 18px;
  cursor: pointer; padding: 0; border-radius: 3px; flex-shrink: 0;
}
input[type=checkbox] { accent-color: #4a9eff; cursor: pointer; }
.vui-pos {
  font-size: 10px; color: #666; font-family: 'Consolas', monospace;
  background: rgba(0,0,0,0.28); border-radius: 4px; padding: 4px 7px;
  letter-spacing: 0.2px; line-height: 1.6;
}

.vui-gizmo {
  position: absolute; bottom: 18px; right: 18px;
  pointer-events: all; cursor: pointer;
  border-radius: 50%; overflow: hidden;
}
.vui-gizmo canvas { display: block; }

.vui-props {
  position: absolute; bottom: 18px; left: 50%; transform: translateX(-50%);
  background: rgba(15,15,15,0.93); border: 1px solid #272727; border-radius: 8px;
  padding: 10px 14px; pointer-events: all; min-width: 230px; max-width: 360px;
  display: none;
}
.vui-props.vui-visible { display: block; }
.vui-props-title {
  margin: 0 0 8px 0; font-size: 10px; font-weight: 600;
  color: #585858; text-transform: uppercase; letter-spacing: 0.9px;
  display: flex; justify-content: space-between; align-items: center;
}
.vui-prop { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px; gap: 10px; }
.vui-prop:last-child { margin-bottom: 0; }
.vui-pk { color: #777; white-space: nowrap; }
.vui-pv { color: #ccc; font-family: 'Consolas', monospace; text-align: right; word-break: break-all; }
`

class ViewerUI {
  constructor (viewer, renderer, controls) {
    this.viewer = viewer
    this.renderer = renderer
    this.controls = controls
    this.renderMode = 'normal'
    this.composer = null

    this._injectStyles()
    this._buildOverlay()
    this._initPostProcessing()
    this._bindRaycast()
  }

  updateControls (controls) {
    this.controls = controls
  }

  _injectStyles () {
    if (document.getElementById('vui-css')) return
    const el = document.createElement('style')
    el.id = 'vui-css'
    el.textContent = STYLES
    document.head.appendChild(el)
  }

  _buildOverlay () {
    const overlay = document.createElement('div')
    overlay.className = 'vui-overlay'
    document.body.appendChild(overlay)
    this._overlay = overlay

    this._buildTopBar()
    this._buildCameraPanel()
    this._buildLightingPanel()
    this._buildPropertiesPanel()
    this._buildGizmo()
  }

  _buildTopBar () {
    const bar = document.createElement('div')
    bar.className = 'vui-topbar'

    this._modeBtns = {}
    for (const { id, label } of [
      { id: 'normal', label: 'Normal' },
      { id: 'wireframe', label: 'Wireframe' },
      { id: 'postprocess', label: 'Post-Process' },
    ]) {
      const btn = document.createElement('button')
      btn.className = 'vui-mode-btn' + (id === 'normal' ? ' vui-active' : '')
      btn.textContent = label
      btn.onclick = () => this._setRenderMode(id)
      bar.appendChild(btn)
      this._modeBtns[id] = btn
    }

    this._overlay.appendChild(bar)
  }

  _buildCameraPanel () {
    const panel = this._makePanel('vui-panel-left', 'Camera', 'camera')
    const { camera } = this.viewer

    this._addSection(panel, 'Optics')
    const [fovSlider, fovNum] = this._addSliderRow(panel, 'FOV', 30, 120, 1, camera.fov)
    const applyFov = (val) => { camera.fov = val; camera.updateProjectionMatrix() }
    fovSlider.oninput = () => { fovNum.value = fovSlider.value; applyFov(+fovSlider.value) }
    fovNum.oninput = () => { fovSlider.value = fovNum.value; applyFov(+fovNum.value) }

    this._addSection(panel, 'Speed')
    for (const [label, prop] of [['Rotate', 'rotateSpeed'], ['Pan', 'panSpeed'], ['Zoom', 'zoomSpeed']]) {
      const [s, n] = this._addSliderRow(panel, label, 0.1, 5, 0.1, this.controls?.[prop] ?? 1)
      s.oninput = () => { n.value = s.value; if (this.controls) this.controls[prop] = +s.value }
      n.oninput = () => { s.value = n.value; if (this.controls) this.controls[prop] = +n.value }
    }

    this._addSection(panel, 'Position')
    const posDiv = document.createElement('div')
    posDiv.className = 'vui-pos'
    panel.querySelector('.vui-panel-body').appendChild(posDiv)
    this._posDisplay = posDiv

    this._overlay.appendChild(panel)
  }

  _buildLightingPanel () {
    const panel = this._makePanel('vui-panel-right', 'Lighting', 'lighting')
    const { ambientLight: amb, directionalLight: dir } = this.viewer

    this._addSection(panel, 'Ambient')
    const ambCol = this._addColorRow(panel, 'Color', '#' + amb.color.getHexString())
    const [ambInt, ambIntN] = this._addSliderRow(panel, 'Intensity', 0, 3, 0.05, amb.intensity)
    ambCol.oninput = () => amb.color.set(ambCol.value)
    ambInt.oninput = () => { ambIntN.value = ambInt.value; amb.intensity = +ambInt.value }
    ambIntN.oninput = () => { ambInt.value = ambIntN.value; amb.intensity = +ambIntN.value }

    this._addSection(panel, 'Directional')
    const dirCol = this._addColorRow(panel, 'Color', '#' + dir.color.getHexString())
    const [dirInt, dirIntN] = this._addSliderRow(panel, 'Intensity', 0, 3, 0.05, dir.intensity)
    const shadowCb = this._addCheckboxRow(panel, 'Shadows', dir.castShadow)
    dirCol.oninput = () => dir.color.set(dirCol.value)
    dirInt.oninput = () => { dirIntN.value = dirInt.value; dir.intensity = +dirInt.value }
    dirIntN.oninput = () => { dirInt.value = dirIntN.value; dir.intensity = +dirIntN.value }
    shadowCb.oninput = () => { dir.castShadow = shadowCb.checked }

    this._overlay.appendChild(panel)
  }

  _buildPropertiesPanel () {
    const el = document.createElement('div')
    el.className = 'vui-props'
    el.innerHTML = `
      <div class="vui-props-title">
        <span class="vui-props-type">Properties</span>
      </div>
      <div class="vui-prop-list"></div>
    `
    this._overlay.appendChild(el)
    this._propsPanel = el
    this._propList = el.querySelector('.vui-prop-list')
  }

  _buildGizmo () {
    const canvas = document.createElement('canvas')
    canvas.width = 120
    canvas.height = 120

    const wrap = document.createElement('div')
    wrap.className = 'vui-gizmo'
    wrap.title = 'Click axis to snap camera'
    wrap.appendChild(canvas)
    this._overlay.appendChild(wrap)

    this._gizmoCanvas = canvas
    this._gizmoCtx = canvas.getContext('2d')
    canvas.addEventListener('click', e => this._onGizmoClick(e))
  }

  // ── Panel helpers ──────────────────────────────────────────────────────────

  _makePanel (posClass, title, key) {
    const el = document.createElement('div')
    el.className = `vui-panel ${posClass}`

    const heading = document.createElement('div')
    heading.className = 'vui-panel-title'
    heading.innerHTML = `<span>${title}</span><span class="vui-collapse-btn">−</span>`
    heading.querySelector('.vui-collapse-btn').onclick = e => {
      el.classList.toggle('collapsed')
      e.target.textContent = el.classList.contains('collapsed') ? '+' : '−'
    }

    const body = document.createElement('div')
    body.className = 'vui-panel-body'

    el.appendChild(heading)
    el.appendChild(body)
    return el
  }

  _addSection (panel, label) {
    const s = document.createElement('div')
    s.className = 'vui-section'
    s.textContent = label
    panel.querySelector('.vui-panel-body').appendChild(s)
  }

  _addSliderRow (panel, label, min, max, step, value) {
    const row = document.createElement('div')
    row.className = 'vui-row'

    const lbl = document.createElement('span')
    lbl.className = 'vui-lbl'
    lbl.textContent = label

    const slider = document.createElement('input')
    Object.assign(slider, { type: 'range', className: 'vui-range', min, max, step, value })

    const num = document.createElement('input')
    Object.assign(num, { type: 'number', className: 'vui-num', min, max, step, value })

    row.appendChild(lbl)
    row.appendChild(slider)
    row.appendChild(num)
    panel.querySelector('.vui-panel-body').appendChild(row)
    return [slider, num]
  }

  _addColorRow (panel, label, value) {
    const row = document.createElement('div')
    row.className = 'vui-row'

    const lbl = document.createElement('span')
    lbl.className = 'vui-lbl'
    lbl.textContent = label

    const inp = document.createElement('input')
    Object.assign(inp, { type: 'color', className: 'vui-color', value })

    row.appendChild(lbl)
    row.appendChild(inp)
    panel.querySelector('.vui-panel-body').appendChild(row)
    return inp
  }

  _addCheckboxRow (panel, label, checked) {
    const row = document.createElement('div')
    row.className = 'vui-row'

    const lbl = document.createElement('span')
    lbl.className = 'vui-lbl'
    lbl.textContent = label

    const inp = document.createElement('input')
    inp.type = 'checkbox'
    inp.checked = checked

    row.appendChild(lbl)
    row.appendChild(inp)
    panel.querySelector('.vui-panel-body').appendChild(row)
    return inp
  }

  // ── Render modes ──────────────────────────────────────────────────────────

  _setRenderMode (mode) {
    this.renderMode = mode
    Object.values(this._modeBtns).forEach(b => b.classList.remove('vui-active'))
    this._modeBtns[mode].classList.add('vui-active')
    this.viewer.world.material.wireframe = mode === 'wireframe'
  }

  // ── Post-processing ───────────────────────────────────────────────────────

  _initPostProcessing () {
    try {
      require('three/examples/js/postprocessing/EffectComposer')
      require('three/examples/js/postprocessing/RenderPass')
      require('three/examples/js/postprocessing/ShaderPass')
      require('three/examples/js/shaders/LuminosityHighPassShader')
      require('three/examples/js/shaders/CopyShader')
      require('three/examples/js/postprocessing/UnrealBloomPass')

      const { scene, camera } = this.viewer
      const composer = new THREE.EffectComposer(this.renderer)
      composer.addPass(new THREE.RenderPass(scene, camera))
      composer.addPass(new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.6, 0.4, 0.85
      ))
      this.composer = composer
    } catch (e) {
      console.warn('Post-processing unavailable:', e.message)
      this._modeBtns.postprocess.disabled = true
      this._modeBtns.postprocess.title = 'Post-processing not available in this build'
    }
  }

  // ── Axis gizmo ────────────────────────────────────────────────────────────

  _gizmoAxes () {
    const rotMatrix = new THREE.Matrix4().extractRotation(this.viewer.camera.matrixWorldInverse)
    const len = 42

    return [
      { dir: new THREE.Vector3(1, 0, 0), color: '#e84040', label: 'X' },
      { dir: new THREE.Vector3(0, 1, 0), color: '#40c840', label: 'Y' },
      { dir: new THREE.Vector3(0, 0, 1), color: '#4080ff', label: 'Z' },
      { dir: new THREE.Vector3(-1, 0, 0), color: '#7a1e1e', label: '', neg: true },
      { dir: new THREE.Vector3(0, -1, 0), color: '#1e601e', label: '', neg: true },
      { dir: new THREE.Vector3(0, 0, -1), color: '#1e3878', label: '', neg: true },
    ].map(a => {
      const v = a.dir.clone().applyMatrix4(rotMatrix)
      return { ...a, sx: 60 + v.x * len, sy: 60 - v.y * len, depth: v.z }
    })
  }

  _drawGizmo () {
    const ctx = this._gizmoCtx
    ctx.clearRect(0, 0, 120, 120)

    ctx.beginPath()
    ctx.arc(60, 60, 58, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(15,15,15,0.72)'
    ctx.fill()

    const axes = this._gizmoAxes().sort((a, b) => a.depth - b.depth)

    for (const a of axes) {
      ctx.beginPath()
      ctx.moveTo(60, 60)
      ctx.lineTo(a.sx, a.sy)
      ctx.strokeStyle = a.color
      ctx.lineWidth = a.neg ? 1.5 : 2.5
      ctx.stroke()

      const r = a.neg ? 5 : 9
      ctx.beginPath()
      ctx.arc(a.sx, a.sy, r, 0, Math.PI * 2)
      ctx.fillStyle = a.color
      ctx.fill()

      if (a.label) {
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 8px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(a.label, a.sx, a.sy)
      }
    }

    ctx.beginPath()
    ctx.arc(60, 60, 3, 0, Math.PI * 2)
    ctx.fillStyle = '#666'
    ctx.fill()
  }

  _onGizmoClick (e) {
    const rect = this._gizmoCanvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    for (const a of this._gizmoAxes()) {
      const dx = mx - a.sx
      const dy = my - a.sy
      if (dx * dx + dy * dy < 81) {
        this._snapCamera(a.dir)
        return
      }
    }
  }

  _snapCamera (axis) {
    const { camera } = this.viewer
    if (!this.controls) return

    const target = this.controls.target.clone()
    const dist = camera.position.distanceTo(target)
    const dest = target.clone().add(axis.clone().multiplyScalar(dist))

    new TWEEN.Tween(camera.position)
      .to({ x: dest.x, y: dest.y, z: dest.z }, 400)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(() => this.controls && this.controls.update())
      .start()
  }

  // ── Raycasting / Properties ───────────────────────────────────────────────

  _bindRaycast () {
    const canvas = this.renderer.domElement
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    let lastRaycast = 0

    canvas.addEventListener('pointermove', evt => {
      const now = performance.now()
      if (now - lastRaycast < 50) return
      lastRaycast = now

      mouse.set(
        (evt.clientX / canvas.clientWidth) * 2 - 1,
        -(evt.clientY / canvas.clientHeight) * 2 + 1
      )
      raycaster.setFromCamera(mouse, this.viewer.camera)

      const targets = [
        ...Object.values(this.viewer.world.sectionMeshs),
        ...Object.values(this.viewer.entities.entities),
      ]
      const hits = raycaster.intersectObjects(targets, true)

      if (!hits.length) {
        this._propsPanel.classList.remove('vui-visible')
        return
      }

      const hit = hits[0]
      const entityMesh = this._findEntityAncestor(hit.object)

      if (entityMesh) {
        this._showEntityProps(entityMesh.userData.entityData)
      } else {
        this._showBlockProps(hit)
      }
    })

    canvas.addEventListener('mouseleave', () => {
      this._propsPanel.classList.remove('vui-visible')
    })
  }

  _findEntityAncestor (obj) {
    const entityMeshes = Object.values(this.viewer.entities.entities)
    let current = obj
    while (current) {
      if (entityMeshes.includes(current)) return current
      current = current.parent
    }
    return null
  }

  _showBlockProps (hit) {
    const n = hit.face.normal
    const p = hit.point
    const bx = Math.floor(p.x - n.x * 0.5)
    const by = Math.floor(p.y - n.y * 0.5)
    const bz = Math.floor(p.z - n.z * 0.5)

    const faceLabels = {
      '1,0,0': '+X  East', '-1,0,0': '-X  West',
      '0,1,0': '+Y  Top', '0,-1,0': '-Y  Bottom',
      '0,0,1': '+Z  South', '0,0,-1': '-Z  North',
    }

    this._showProps('Block', {
      Position: `${bx}, ${by}, ${bz}`,
      Chunk: `${Math.floor(bx / 16) * 16}, ${Math.floor(bz / 16) * 16}`,
      'Section Y': `${Math.floor(by / 16) * 16}`,
      'Local Pos': `${bx & 15}, ${by & 15}, ${bz & 15}`,
      Face: faceLabels[`${n.x},${n.y},${n.z}`] || `${n.x},${n.y},${n.z}`,
      Distance: `${hit.distance.toFixed(2)}m`,
    })
  }

  _showEntityProps (data) {
    if (!data) return
    const props = {}
    for (const [k, v] of Object.entries(data)) {
      if (v !== null && v !== undefined && typeof v === 'object') {
        const parts = ['x', 'y', 'z'].map(c => v[c]?.toFixed(2)).filter(Boolean)
        props[k] = parts.length ? parts.join(', ') : JSON.stringify(v)
      } else if (v !== undefined) {
        props[k] = String(v)
      }
    }
    this._showProps('Entity', props)
  }

  _showProps (type, props) {
    this._propsPanel.querySelector('.vui-props-type').textContent = `${type} Properties`
    this._propList.innerHTML = Object.entries(props)
      .map(([k, v]) => `<div class="vui-prop"><span class="vui-pk">${k}</span><span class="vui-pv">${v}</span></div>`)
      .join('')
    this._propsPanel.classList.add('vui-visible')
  }

  // ── Public API ────────────────────────────────────────────────────────────

  onResize () {
    if (this.composer) this.composer.setSize(window.innerWidth, window.innerHeight)
  }

  update () {
    const p = this.viewer.camera.position
    if (this._posDisplay) {
      this._posDisplay.innerHTML =
        `x: ${p.x.toFixed(2)}<br>y: ${p.y.toFixed(2)}<br>z: ${p.z.toFixed(2)}`
    }
    this._drawGizmo()
  }

  render () {
    if (this.renderMode === 'postprocess' && this.composer) {
      this.composer.render()
    } else {
      this.renderer.render(this.viewer.scene, this.viewer.camera)
    }
  }
}

module.exports = { ViewerUI }
