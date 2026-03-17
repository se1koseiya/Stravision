declare module "flv.js" {
  type FlvPlayerInstance = {
    attachMediaElement: (el: HTMLVideoElement) => void
    load: () => void
    play: () => void
    destroy: () => void
    unload: () => void
    on: (eventName: string, handler: (...args: unknown[]) => void) => void
  }

  type FlvJS = {
    createPlayer: (opts: { type: string; url: string; isLive?: boolean; cors?: boolean }) => FlvPlayerInstance
    Events: { ERROR: string }
  }

  const flvjs: FlvJS
  export default flvjs
}

