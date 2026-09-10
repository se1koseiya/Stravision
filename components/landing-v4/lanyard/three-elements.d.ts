/**
 * meshline 通过 extend() 注册成 R3F 的 JSX intrinsic 元素，
 * 这里补上类型声明，否则 <meshLineGeometry /> / <meshLineMaterial /> 会报 TS 错。
 */
import type { ThreeElement } from '@react-three/fiber'
import type { MeshLineGeometry, MeshLineMaterial } from 'meshline'

declare module '@react-three/fiber' {
  interface ThreeElements {
    meshLineGeometry: ThreeElement<typeof MeshLineGeometry>
    meshLineMaterial: ThreeElement<typeof MeshLineMaterial>
  }
}
