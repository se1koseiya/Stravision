import { describe, it, expect } from 'vitest'
import { supportsSearch, getSearchUnsupportedMessage } from './model-compatibility'

describe('Model Compatibility Utils', () => {
  describe('supportsSearch', () => {
    it('should return true for qwen-max models', () => {
      expect(supportsSearch('qwen-max', 'https://dashscope.aliyuncs.com')).toBe(true)
      expect(supportsSearch('qwen-max-latest', 'https://dashscope.aliyuncs.com')).toBe(true)
    })

    it('should return true for qwen3-max models', () => {
      expect(supportsSearch('qwen3-max', 'https://dashscope.aliyuncs.com')).toBe(true)
      expect(supportsSearch('qwen3-max-latest', 'https://dashscope.aliyuncs.com')).toBe(true)
    })

    it('should return false for qwen-plus models', () => {
      expect(supportsSearch('qwen-plus', 'https://dashscope.aliyuncs.com')).toBe(false)
      expect(supportsSearch('qwen-vl-plus', 'https://dashscope.aliyuncs.com')).toBe(false)
    })

    it('should return false for OpenAI models', () => {
      expect(supportsSearch('gpt-3.5-turbo', 'https://api.openai.com')).toBe(false)
      expect(supportsSearch('gpt-4o', 'https://api.openai.com')).toBe(false)
    })

    it('should return false for undefined model', () => {
      expect(supportsSearch(undefined, 'https://dashscope.aliyuncs.com')).toBe(false)
    })

    it('should handle case-insensitive model names', () => {
      expect(supportsSearch('QWEN-MAX', 'https://dashscope.aliyuncs.com')).toBe(true)
      expect(supportsSearch('Qwen3-Max', 'https://dashscope.aliyuncs.com')).toBe(true)
    })
  })

  describe('getSearchUnsupportedMessage', () => {
    it('should return appropriate message for OpenAI models', () => {
      const message = getSearchUnsupportedMessage('gpt-4o')
      expect(message).toContain('OpenAI')
    })

    it('should return appropriate message for qwen models', () => {
      const message = getSearchUnsupportedMessage('qwen-plus')
      expect(message).toContain('qwen-max')
    })

    it('should return generic message for unknown models', () => {
      const message = getSearchUnsupportedMessage('unknown-model')
      expect(message).toContain('不支持')
    })

    it('should return message for undefined model', () => {
      const message = getSearchUnsupportedMessage(undefined)
      expect(message).toContain('选择')
    })
  })
})
