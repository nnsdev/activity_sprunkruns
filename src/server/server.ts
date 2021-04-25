import { ACTIVITY_NAME } from './../common/config'
import { RpcCallback, JobData } from '../common/types'
import { VEHICLE, BOXES_PER_ZONE, ZONE_AMOUNT } from '../common/config'
import { spawnVehicle } from './helpers'
import { JOB_AREAS } from '../common/areas'

let activityEnabled = true

const jobs: { [key: string]: JobData } = {}

const activatedAreas = JOB_AREAS

on(`activity_${ACTIVITY_NAME}:server:toggleActivity`, (enabledDisabled: boolean) => {
  activityEnabled = enabledDisabled
})

const canRequestJob = (source: string): boolean => {
  return activityEnabled && jobs[source] == null
}

on(`activity_${ACTIVITY_NAME}:server:requestJob`, async (source: string, callback: RpcCallback<null|JobData>) => {
  if (!canRequestJob(source)) {
    return callback(null)
  }

  jobs[source] = await generateJobData(source)
  callback(jobs[source])
})

on(`activity_${ACTIVITY_NAME}:server:triggerZoneChange`, (source: string, isInZone: boolean) => {
  if (!jobs[source]) {
    return
  }

  jobs[source].zones[jobs[source].currentZone].isInZone = isInZone
})

const canHoldBox = (source: string): boolean => {
  if (!jobs[source]) {
    return false
  }
  const currentZone = jobs[source].zones[jobs[source].currentZone]

  return currentZone.isInZone
}

on(`activity_${ACTIVITY_NAME}:server:getBox`, (source: string, callback: RpcCallback<boolean>) => {
  if (!canHoldBox(source)) {
    return callback(false)
  }

  const currentZone = jobs[source].zones[jobs[source].currentZone]
  currentZone.holdingBox = true
  callback(true)
})

const canDeliverBox = (source: string, currentZoneIndex: number, netId: number): boolean => {
  if (!jobs[source] || jobs[source].currentZone !== currentZoneIndex) {
    return false
  }

  const currentZone = jobs[source].zones[jobs[source].currentZone]

  return currentZone.isInZone && currentZone.holdingBox && !currentZone.boxesDelivered.includes(netId)
}

on(`activity_${ACTIVITY_NAME}:server:deliverBox`, (source: string, callback: RpcCallback<boolean>, currentZoneIndex: number, netId: number) => {
  if (!canDeliverBox(source, currentZoneIndex, netId)) {
    return callback(false)
  }

  const currentZone = jobs[source].zones[jobs[source].currentZone]
  currentZone.boxesDelivered.push(netId)

  if (currentZone.boxesDelivered.length === BOXES_PER_ZONE) {
    jobs[source].currentZone++
  }

  callback(true)
})

on(`activity_${ACTIVITY_NAME}:server:handInCar`, (source: string, callback: RpcCallback<boolean>) => {
  if (!jobs[source] || jobs[source].currentZone < ZONE_AMOUNT) {
    return callback(false)
  }

  const vehicle = NetworkGetEntityFromNetworkId(jobs[source].jobVehicle)

  if (vehicle && vehicle > 0) {
    DeleteEntity(vehicle)
  }

  delete jobs[source]
})

const generateJobData = async (source: string): Promise<JobData> => {
  const jobVehicle = await spawnVehicle(source, VEHICLE) // should be replaced with np stuff

  return {
    zones: Object.keys(activatedAreas).filter(area => activatedAreas[area].enabled).sort(() => Math.random() - 0.5).slice(0, ZONE_AMOUNT).map(area => ({
      zone: activatedAreas[area].name,
      boxesDelivered: [],
      isInZone: false,
      holdingBox: false
    })),
    currentZone: 0,
    finished: false,
    jobVehicle
  }
}