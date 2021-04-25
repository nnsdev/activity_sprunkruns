import { SPAWN_LOCATION, SPAWN_HEADING } from '../common/config'
export const spawnVehicle = async (source: string, model: string|number): Promise<number> => {
  const vehicle = CreateVehicle(
    typeof model == "string" ? GetHashKey(model) : model,
    SPAWN_LOCATION.x,
    SPAWN_LOCATION.y,
    SPAWN_LOCATION.z,
    SPAWN_HEADING,
    true,
    true
  )

  TaskWarpPedIntoVehicle(GetPlayerPed(source), vehicle, -1)

  const netId = await waitForNetId(vehicle)

  return netId
}

const waitForNetId = async (vehicle: number, attempts = 0): Promise<number> => {
  if (attempts >= 5) {
    return 0
  }

  await delay(150)

  try {
    const netId = NetworkGetNetworkIdFromEntity(vehicle)
    return netId
  } catch {
    return waitForNetId(vehicle, attempts + 1)
  }
}

export const delay = (ms: number): Promise<boolean> => {
  return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true)
      }, ms)
  })
}
