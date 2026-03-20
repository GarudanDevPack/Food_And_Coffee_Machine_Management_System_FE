'use client'
import PageTitle from '@/components/PageTitle'
import { machinesApi } from '@/lib/api'
import { useSession } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'
import { Badge, Button, Card, CardBody, Col, Modal, Row, Spinner, Table } from 'react-bootstrap'
import { toast } from 'react-toastify'
import Swal from 'sweetalert2'
import MachineModal from './components/MachineModal'
import { QRCodeCanvas } from 'qrcode.react'

interface CalibrationEntry {
  itemId?: string
  nozzle?: number
  timerOfPowder?: number
  timerOfWater?: number
  cupSize?: string
  volMl?: number
  volGram?: number
}

interface Machine {
  _id?: string
  id?: string
  machineId: string
  name: string
  machineType?: string
  location?: string
  isOnline?: boolean
  sleepMode?: boolean
  status?: string
  totalOrders?: number
  totalRevenue?: number
  sensor?: {
    temp?: number
    water?: string
    powderlevel?: number[]
  }
  calibration?: CalibrationEntry[]
  lastSeen?: string
  error?: string
}

function TelemetryModal({ machine, onHide }: { machine: Machine | null; onHide: () => void }) {
  if (!machine) return null
  const sensor = machine.sensor ?? {}
  const waterColor = sensor.water === 'full' ? 'success' : sensor.water === 'low' ? 'warning' : 'danger'

  return (
    <Modal show={!!machine} onHide={onHide} centered size="sm">
      <Modal.Header closeButton>
        <Modal.Title className="fs-15">
          <i className="ri-temp-hot-line me-2 text-info" />
          Telemetry — {machine.name}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3 d-flex align-items-center gap-3">
          <span className={`badge bg-${machine.isOnline ? 'success' : 'danger'} fs-12`}>
            {machine.isOnline ? 'Online' : 'Offline'}
          </span>
          {machine.lastSeen && (
            <span className="text-muted fs-12">
              Last seen: {new Date(machine.lastSeen).toLocaleString('en-GB')}
            </span>
          )}
        </div>

        <div className="row g-3 mb-3">
          <div className="col-6">
            <div className="card border text-center p-3">
              <div className="fs-28 fw-bold text-danger">
                {sensor.temp != null ? `${sensor.temp}°C` : '—'}
              </div>
              <div className="text-muted fs-12 mt-1">Temperature</div>
              {sensor.temp != null && sensor.temp > 70 && (
                <div className="text-danger fs-11 mt-1">⚠ High temp!</div>
              )}
            </div>
          </div>
          <div className="col-6">
            <div className="card border text-center p-3">
              <div className={`fs-24 fw-bold text-${waterColor} text-capitalize`}>
                {sensor.water ?? '—'}
              </div>
              <div className="text-muted fs-12 mt-1">Water Level</div>
            </div>
          </div>
        </div>

        {sensor.powderlevel && sensor.powderlevel.length > 0 && (
          <div>
            <div className="fw-semibold fs-13 mb-2">Powder / Nozzle Levels</div>
            {sensor.powderlevel.map((item: any, i) => {
              const pct = typeof item === 'object' ? (item.level ?? 0) : item
              const label = typeof item === 'object' ? (item.canister ?? `Nozzle ${i + 1}`) : `Nozzle ${i + 1}`
              return (
              <div key={i} className="mb-2">
                <div className="d-flex justify-content-between fs-12 mb-1">
                  <span>{label}</span>
                  <span className={pct < 20 ? 'text-danger fw-bold' : 'text-muted'}>{pct}%</span>
                </div>
                <div className="progress" style={{ height: 8 }}>
                  <div
                    className={`progress-bar bg-${pct < 20 ? 'danger' : pct < 50 ? 'warning' : 'success'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              )
            })}
          </div>
        )}

        {machine.error && (
          <div className="alert alert-danger py-2 fs-13 mt-2">
            <i className="ri-error-warning-line me-1" />
            Error: {machine.error}
          </div>
        )}

        {!sensor.temp && !sensor.water && !sensor.powderlevel?.length && !machine.error && (
          <div className="text-center text-muted py-3 fs-13">
            <i className="ri-wifi-off-line d-block fs-28 mb-2" />
            No telemetry data received yet.<br />Machine may be offline or not reporting.
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" size="sm" onClick={onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  )
}

function QRModal({ machine, onHide }: { machine: Machine | null; onHide: () => void }) {
  const canvasRef = useRef<HTMLDivElement>(null)

  const handleDownload = () => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current.querySelector('canvas')
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-${machine?.machineId ?? 'machine'}.png`
    a.click()
  }

  return (
    <Modal show={!!machine} onHide={onHide} centered size="sm">
      <Modal.Header closeButton>
        <Modal.Title className="fs-15">QR Code</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center py-4">
        {machine && (
          <>
            <div ref={canvasRef} className="d-inline-block p-3 border rounded mb-3">
              <QRCodeCanvas
                value={machine.machineId}
                size={220}
                level="H"
                marginSize={2}
              />
            </div>
            <p className="mb-1 fw-semibold">{machine.name}</p>
            <code className="text-muted small">{machine.machineId}</code>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={onHide}>Close</Button>
        <Button variant="primary" onClick={handleDownload}>
          <i className="ri-download-2-line me-1" /> Download PNG
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

function CalibrationModal({ machine, onHide, token }: { machine: Machine | null; onHide: () => void; token: string }) {
  const [rows, setRows] = useState<CalibrationEntry[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (machine) setRows(machine.calibration ?? [])
  }, [machine])

  const update = (i: number, field: keyof CalibrationEntry, val: string) => {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: field === 'cupSize' || field === 'itemId' ? val : Number(val) } : r))
  }

  const handleSave = async () => {
    if (!machine) return
    setSaving(true)
    try {
      await machinesApi.updateCalibration(token, machine.machineId, { calibration: rows })
      toast.success('Calibration saved')
      onHide()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save calibration')
    } finally { setSaving(false) }
  }

  return (
    <Modal show={!!machine} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="fs-15">
          <i className="ri-settings-3-line me-2 text-warning" />
          Calibration — {machine?.name}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {rows.length === 0 ? (
          <div className="text-center text-muted py-4 fs-13">
            <i className="ri-settings-3-line d-block fs-32 mb-2" />
            No calibration data stored for this machine.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm table-bordered fs-13">
              <thead className="table-light">
                <tr>
                  <th>Nozzle</th>
                  <th>Cup Size</th>
                  <th>Powder Timer (ms)</th>
                  <th>Water Timer (ms)</th>
                  <th>Vol (ml)</th>
                  <th>Vol (g)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="text-muted">{r.nozzle ?? i + 1}</td>
                    <td><input className="form-control form-control-sm" value={r.cupSize ?? ''} onChange={(e) => update(i, 'cupSize', e.target.value)} /></td>
                    <td><input className="form-control form-control-sm" type="number" value={r.timerOfPowder ?? ''} onChange={(e) => update(i, 'timerOfPowder', e.target.value)} /></td>
                    <td><input className="form-control form-control-sm" type="number" value={r.timerOfWater ?? ''} onChange={(e) => update(i, 'timerOfWater', e.target.value)} /></td>
                    <td><input className="form-control form-control-sm" type="number" value={r.volMl ?? ''} onChange={(e) => update(i, 'volMl', e.target.value)} /></td>
                    <td><input className="form-control form-control-sm" type="number" value={r.volGram ?? ''} onChange={(e) => update(i, 'volGram', e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" size="sm" onClick={onHide}>Cancel</Button>
        <Button variant="warning" size="sm" onClick={handleSave} disabled={saving || rows.length === 0}>
          {saving ? <Spinner size="sm" className="me-1" /> : <i className="ri-save-line me-1" />}
          Save Calibration
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default function MachinesPage() {
  const { data: session } = useSession()
  const token = (session?.user as any)?.token ?? ''

  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Machine | null>(null)
  const [qrMachine, setQrMachine] = useState<Machine | null>(null)
  const [telemetryMachine, setTelemetryMachine] = useState<Machine | null>(null)
  const [calibrationMachine, setCalibrationMachine] = useState<Machine | null>(null)

  const fetchMachines = async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await machinesApi.list(token)
      setMachines(data as Machine[])
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load machines')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMachines() }, [token])

  const handleDelete = async (m: Machine) => {
    const result = await Swal.fire({
      title: 'Delete Machine?',
      text: `"${m.name}" will be permanently deleted.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Delete',
    })
    if (!result.isConfirmed) return
    try {
      await machinesApi.delete(token, m._id ?? m.id)
      toast.success('Machine deleted')
      fetchMachines()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to delete')
    }
  }

  const handleSleep = async (m: Machine) => {
    const isSleeping = m.sleepMode
    const action = isSleeping ? 'Wake' : 'Sleep'
    const result = await Swal.fire({
      title: `${action} Machine?`,
      text: isSleeping ? `Wake \"${m.name}\" — it will start accepting orders again.` : `Put \"${m.name}\" to sleep — it will stop accepting orders.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: action,
    })
    if (!result.isConfirmed) return
    try {
      if (isSleeping) {
        await machinesApi.wake(token, m.machineId)
        toast.success('Machine woken up')
      } else {
        await machinesApi.sleep(token, m.machineId)
        toast.success('Machine put to sleep')
      }
      fetchMachines()
    } catch (err: any) {
      toast.error(err.message ?? `Failed to ${action.toLowerCase()} machine`)
    }
  }

  const handleFlush = async (m: Machine) => {
    const result = await Swal.fire({
      title: 'Flush Machine?',
      text: `Send flush command to "${m.name}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Flush',
    })
    if (!result.isConfirmed) return
    try {
      await machinesApi.flush(token, m.machineId)
      toast.success('Flush command sent')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to flush')
    }
  }

  const onlineCount = machines.filter((m) => m.isOnline).length

  return (
    <>
      <PageTitle title="Machine Management" subTitle="Operations" />

      <Row className="mb-3">
        <Col>
          <div className="d-flex gap-2 flex-wrap align-items-center">
            <Badge bg="secondary" className="fs-13 fw-normal px-3 py-2">Total: {machines.length}</Badge>
            <Badge bg="success" className="fs-13 fw-normal px-3 py-2">Online: {onlineCount}</Badge>
            <Badge bg="danger" className="fs-13 fw-normal px-3 py-2">Offline: {machines.length - onlineCount}</Badge>
          </div>
        </Col>
        <Col xs="auto">
          <Button variant="primary" size="sm" onClick={() => { setEditing(null); setShowModal(true) }}>
            + Add Machine
          </Button>
          <Button variant="light" size="sm" className="ms-2" onClick={fetchMachines} disabled={loading}>
            {loading ? <Spinner size="sm" /> : <i className="ri-refresh-line" />} Refresh
          </Button>
        </Col>
      </Row>

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="text-center py-5"><Spinner /></div>
          ) : (
            <div className="table-responsive">
              <Table className="table-custom table-centered table-sm table-nowrap table-hover mb-0">
                <thead>
                  <tr>
                    <th>Machine ID</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th className="text-end">Orders</th>
                    <th className="text-end">Revenue</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {machines.length === 0 ? (
                    <tr><td colSpan={8} className="text-center text-muted py-4">No machines found</td></tr>
                  ) : machines.map((m) => (
                    <tr key={m.machineId}>
                      <td><code className="fs-12">{m.machineId}</code></td>
                      <td className="fw-semibold">{m.name}</td>
                      <td>
                        <Badge bg={m.machineType === 'food' ? 'warning' : 'info'} className="text-capitalize">
                          {m.machineType ?? 'coffee'}
                        </Badge>
                      </td>
                      <td className="text-muted">{m.location ?? '—'}</td>
                      <td>
                        <span className={`d-flex align-items-center gap-1 fs-13 ${m.isOnline ? 'text-success' : 'text-danger'}`}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.isOnline ? '#0acf97' : '#fa5c7c', display: 'inline-block' }} />
                          {m.isOnline ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td className="text-end">{m.totalOrders ?? 0}</td>
                      <td className="text-end text-success">LKR {(m.totalRevenue ?? 0).toLocaleString()}</td>
                      <td className="text-center">
                        <div className="d-flex gap-1 justify-content-center">
                          <Button variant="soft-info" size="sm" onClick={() => setQrMachine(m)} title="Show QR Code">
                            <i className="ri-qr-code-line" />
                          </Button>
                          <Button variant="soft-secondary" size="sm" onClick={() => setTelemetryMachine(m)} title="Telemetry">
                            <i className="ri-temp-hot-line" />
                          </Button>
                          <Button variant="soft-primary" size="sm" onClick={() => { setEditing(m); setShowModal(true) }} title="Edit">
                            <i className="ri-edit-line" />
                          </Button>
                          <Button
                            variant={m.sleepMode ? 'soft-success' : 'soft-secondary'}
                            size="sm"
                            onClick={() => handleSleep(m)}
                            title={m.sleepMode ? 'Wake Machine' : 'Sleep Machine'}>
                            <i className={m.sleepMode ? 'ri-sun-line' : 'ri-moon-line'} />
                          </Button>
                          <Button variant="soft-warning" size="sm" onClick={() => setCalibrationMachine(m)} title="Calibration">
                            <i className="ri-settings-3-line" />
                          </Button>
                          <Button variant="soft-warning" size="sm" onClick={() => handleFlush(m)} title="Flush">
                            <i className="ri-refresh-line" />
                          </Button>
                          <Button variant="soft-danger" size="sm" onClick={() => handleDelete(m)} title="Delete">
                            <i className="ri-delete-bin-line" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>

      <MachineModal show={showModal} onHide={() => setShowModal(false)} machine={editing} onSaved={fetchMachines} />
      <QRModal machine={qrMachine} onHide={() => setQrMachine(null)} />
      <TelemetryModal machine={telemetryMachine} onHide={() => setTelemetryMachine(null)} />
      <CalibrationModal machine={calibrationMachine} onHide={() => setCalibrationMachine(null)} token={token} />
    </>
  )
}
