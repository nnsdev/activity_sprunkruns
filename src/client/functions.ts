export const rpcCallback = global.exports['nsb_rpc'].callback_request

export const rpc = (event: string, ...params: any[]): Promise<any> => {
  return new Promise((resolve) => {
    rpcCallback(event, (result) => {
      resolve(result)
    }, ...params)
  })
}
