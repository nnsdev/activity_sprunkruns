import { ACTIVITY_NAME } from './../common/config'
import { rpc } from './functions'
import { JobData, ZoneData } from '../common/types'
import { ZONE_INTERVAL, BOXES_PER_ZONE, SPAWN_LOCATION, ZONE_AMOUNT, COMPLETION_TIMES } from '../common/config'
import { Game, Vector3, getRandomInt } from 'fivem-js'
import { playBoxEmote, clearBoxEmote } from './lib'
import { JOB_AREAS } from '../common/areas'

let jobStatus: null|JobData = null
let jobActivated = true
let playerServerId = 0

const startJobThreads = ():void => {
  setTimeout(() => {
    runZoneInterval()
  }, ZONE_INTERVAL)
}

const runZoneInterval = async () => {
  if (!jobStatus) {
    return
  }

  if (jobStatus.currentZone == ZONE_AMOUNT) {
    await handleVehicle()
  } else {
    handleZone()
  }

  setTimeout(() => {
    runZoneInterval()
  }, ZONE_INTERVAL)
}
const handleZone = (): void => {
  const { x, y, z } = Game.PlayerPed.Position

  const zoneName = GetNameOfZone(x, y, z)
  if (zoneName == null || !JOB_AREAS[zoneName]) {
    return
  }

  const currentZone = jobStatus.zones[jobStatus.currentZone]
  if (currentZone.zone === JOB_AREAS[zoneName].name) {
    enteredZone(currentZone)
    return
  }
  if (currentZone.isInZone) {
    leftZone(currentZone)
  }
}

const handleVehicle = async (): Promise<void> => {
  const vehicle = NetworkGetEntityFromNetworkId(jobStatus.jobVehicle)
  if (!vehicle || vehicle == 0) {
    return
  }

  const inVehicle = IsPedInAnyVehicle(PlayerPedId(), false)
  if (inVehicle) {
    return
  }

  const [vehX, vehY, vehZ] = GetEntityCoords(vehicle, true)
  const vehiclePos = new Vector3(vehX, vehY, vehZ)

  if (vehiclePos.distance(SPAWN_LOCATION) < 3) {
    await handleReturn()
  }
}

const handleReturn = async (): Promise<void> => {
  const result = await rpc(`activity_${ACTIVITY_NAME}:server:handInCar`)
  if (!result) {
    return
  }

  global.exports["np-activities"].taskCompleted(ACTIVITY_NAME, playerServerId, "bringBackCar", true, "Van returned")
  global.exports["np-activities"].activityCompleted(ACTIVITY_NAME, playerServerId, true, "Job completed")
  jobStatus = null
}

const enteredZone = (currentZone: ZoneData): void => {
  if (!currentZone.isInZone) {
    rpc(`activity_${ACTIVITY_NAME}:server:triggerZoneChange`, true)
    global.exports["np-activities"].notifyPlayer(playerServerId, "Deliver the sprunk!")
    currentZone.isInZone = true
  }
}

const leftZone = (currentZone: ZoneData): void => {
  rpc(`activity_${ACTIVITY_NAME}:server:triggerZoneChange`, false)

  global.exports["np-activities"].notifyPlayer(playerServerId, `Get back to ${currentZone.zone}`)
  currentZone.isInZone = false
}

on(`activity_${ACTIVITY_NAME}:client:getBox`, async () => {
  if (!jobStatus) {
    return
  }

  const canDoTask = global.exports["np-activities"].canDoTask(ACTIVITY_NAME, playerServerId, "deliverBox")
  if (!canDoTask) {
    return global.exports["np-activities"].notifyPlayer(playerServerId, "You can not currently get the box from the van")
  }

  const getBox = await rpc(`activity_${ACTIVITY_NAME}:server:getBox`, jobStatus.currentZone)
  if (!getBox) {
    return global.exports["np-activities"].notifyPlayer(playerServerId, "You can not currently get the box from the van")
  }
  const currentZone = jobStatus.zones[jobStatus.currentZone]
  currentZone.holdingBox = true

  global.exports["np-activities"].taskInProgress(ACTIVITY_NAME, playerServerId, "deliverBox", "Bring the box from the van to a vending machine")

  playBoxEmote()
})

on(`activity_${ACTIVITY_NAME}:client:deliverBox`, async (entityId: number) => {
  if (!jobStatus) {
    return
  }

  const currentZone = jobStatus.zones[jobStatus.currentZone]

  const netId = NetworkGetNetworkIdFromEntity(entityId)

  if (!currentZone.holdingBox || currentZone.boxesDelivered.includes(netId)) {
    return
  }

  const deliverBox = await rpc(`activity_${ACTIVITY_NAME}:server:deliverBox`, jobStatus.currentZone, netId)
  if (!deliverBox) {
    return global.exports["np-activities"].notifyPlayer(playerServerId, "You can not currently deliver this box")
  }

  currentZone.holdingBox = false
  currentZone.boxesDelivered.push(netId)

  clearBoxEmote()

  handleDelivery(currentZone)
})

const handleDelivery = (currentZone: ZoneData): void => {
  global.exports["np-activities"].taskCompleted(ACTIVITY_NAME, playerServerId, "deliverBox", true, "Box delivered")

  if (currentZone.boxesDelivered.length == BOXES_PER_ZONE) {
    let message = `You are finished at ${currentZone.zone}. Head back to the depot and hand in your car.`
    if (jobStatus.zones.length > (jobStatus.currentZone+1)) {
      message = `You are finished at ${currentZone.zone}. Time to head to ${jobStatus.zones[jobStatus.currentZone+1].zone}!`
    } else {
      global.exports["np-activities"].taskInProgress(ACTIVITY_NAME, playerServerId, "bringBackCar", "Bring back the van to the depot")
    }

    global.exports["np-activities"].notifyPlayer(playerServerId, message)
    jobStatus.currentZone++
    return
  }

  global.exports["np-activities"].notifyPlayer(playerServerId, "Box delivered! Time for the next one.")
}

global.exports('setActivityStatus', (enabledDisabled: boolean) => {
  jobActivated = enabledDisabled
})

global.exports('startActivity', async (_playerServerId: number) => {
  playerServerId = _playerServerId
  const canDoActivity: boolean = global.exports["np-activities"].canDoActivity(ACTIVITY_NAME, playerServerId)
  if (!jobActivated || !canDoActivity) {
    return global.exports["np-activities"].notifyPlayer(playerServerId, "You can not currently do this job")
  }

  const jobData: JobData|null = await rpc(`activity_${ACTIVITY_NAME}:server:requestJob`)
  if (!jobData) {
    return global.exports["np-activities"].notifyPlayer(playerServerId, "You can not currently do this job")
  }

  jobStatus = jobData
  global.exports["np-activities"].activityInProgress(ACTIVITY_NAME, playerServerId, getRandomInt(COMPLETION_TIMES.min, COMPLETION_TIMES.max))
  global.exports["np-activities"].notifyPlayer(playerServerId, `Get to ${jobStatus.zones[0].zone}!`)

  startJobThreads()
})

global.exports('setLocationStatus', (locationId: number, enabledDisabled: boolean) => {
  const index = Object.keys(JOB_AREAS)[locationId]
  if (index != null) {
    JOB_AREAS[index].enabled = enabledDisabled
  }
})

global.exports('setActivityDestination', (locationId: number) => {
  const index = Object.keys(JOB_AREAS)[locationId]
  if (index != null) {
    // not quite sure how to make use of these here.
  }
})

global.exports('removeActivityDestination', (locationId: number) => {
  const index = Object.keys(JOB_AREAS)[locationId]
  if (index != null) {
    // not quite sure how to make use of these here.
  }
})