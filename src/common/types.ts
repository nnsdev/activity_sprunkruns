export type RpcCallback<T> = (...returnValues: T[]) => void

export interface Area {
  enabled: boolean
  name: string
  key: string
}

export interface ZoneData {
  zone: string
  boxesDelivered: number[]
  isInZone: boolean
  holdingBox: boolean
}

export interface JobData {
  zones: Array<ZoneData>
  currentZone: number
  finished: boolean
  jobVehicle: number
}