export type VmType = 'qemu' | 'lxc'

export type ProxmoxVm = {
  vmid: number
  name: string
  type: VmType
  status: string
  node: string
}

type ProxmoxClientConfig = {
  host: string
  port: number
  tokenId: string
  tokenSecret: string
  verifySsl: boolean
}

class ProxmoxClient {
  private baseUrl: string
  private authHeader: string
  private verifySsl: boolean

  constructor(config: ProxmoxClientConfig) {
    this.baseUrl = `https://${config.host}:${config.port}/api2/json`
    this.authHeader = `PVEAPIToken=${config.tokenId}=${config.tokenSecret}`
    this.verifySsl = config.verifySsl
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`

    let prevTls: string | undefined
    if (!this.verifySsl) {
      prevTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    }

    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })
      if (!res.ok) {
        throw new Error(`Proxmox API ${res.status}: ${await res.text()}`)
      }
      const json = (await res.json()) as { data: T }
      return json.data
    } finally {
      if (!this.verifySsl) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = prevTls ?? ''
      }
    }
  }

  async testConnection(): Promise<void> {
    await this.request<unknown>('/nodes')
  }

  async listVms(node: string): Promise<ProxmoxVm[]> {
    const [qemuList, lxcList] = await Promise.all([
      this.request<Array<{ vmid: number; name: string; status: string }>>(`/nodes/${node}/qemu`)
        .then((vms) => vms.map((vm) => ({ ...vm, type: 'qemu' as const, node }))),
      this.request<Array<{ vmid: number; name: string; status: string }>>(`/nodes/${node}/lxc`)
        .then((vms) => vms.map((vm) => ({ ...vm, type: 'lxc' as const, node }))),
    ])
    return [...qemuList, ...lxcList]
  }

  async suspendVm(node: string, vmid: number, type: VmType): Promise<void> {
    await this.request(`/nodes/${node}/${type}/${vmid}/status/suspend`, { method: 'POST' })
  }

  async resumeVm(node: string, vmid: number, type: VmType): Promise<void> {
    await this.request(`/nodes/${node}/${type}/${vmid}/status/resume`, { method: 'POST' })
  }
}

export function createProxmoxClient(config: ProxmoxClientConfig): ProxmoxClient {
  return new ProxmoxClient(config)
}
