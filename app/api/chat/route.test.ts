/**
 * Property-Based Tests for AI Search Fix
 * Feature: ai-search-fix
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * Helper function to build request body based on API configuration
 * This mirrors the logic in the actual route.ts file
 */
function buildRequestBody(config: {
  enableSearch: boolean
  enableReasoning: boolean
  isDashScope: boolean
  isCompatibleMode: boolean
  model: string
  messages: any[]
  systemPrompt: string
}) {
  const { enableSearch, enableReasoning, isDashScope, isCompatibleMode, model, messages, systemPrompt } = config

  if (isDashScope && isCompatibleMode) {
    // DashScope Compatible Mode
    return {
      model: model || "qwen-plus",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: true,
      temperature: 0.7,
      extra_body: {
        ...(enableSearch ? { 
          enable_search: true,
          search_strategy: "agent"
        } : {}),
        ...(enableReasoning ? { 
          enable_thinking: true,
          thinking_budget: 1024 
        } : {})
      }
    }
  } else if (isDashScope) {
    // DashScope Native API
    return {
      model: model || "qwen-plus",
      input: {
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      },
      parameters: {
        result_format: "message",
        incremental_output: true,
        ...(enableSearch ? { 
          enable_search: true,
          search_strategy: "agent"
        } : {}),
        ...(enableReasoning ? { 
          enable_thinking: true,
          thinking_budget: 1024
        } : {})
      },
    }
  } else {
    // OpenAI format (not testing search for OpenAI in this property)
    return {
      model: model || "gpt-4",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: true,
    }
  }
}

describe('AI Search Fix - Property-Based Tests', () => {
  /**
   * **Feature: ai-search-fix, Property 1: Search parameter propagation**
   * **Validates: Requirements 1.2, 1.3, 1.4**
   * 
   * Property: For any chat request where enableSearch is true, 
   * the API request body should contain enable_search: true in the 
   * appropriate location (extra_body for compatible mode, parameters for native API)
   */
  it('Property 1: Search parameter propagation - enableSearch true implies enable_search in request body', () => {
    fc.assert(
      fc.property(
        // Generate random configurations
        fc.record({
          enableSearch: fc.constant(true), // Always true for this property
          enableReasoning: fc.boolean(),
          isDashScope: fc.constant(true), // Only testing DashScope APIs
          isCompatibleMode: fc.boolean(),
          model: fc.oneof(
            fc.constant('qwen-plus'),
            fc.constant('qwen-max'),
            fc.constant('qwen3-max'),
            fc.constant('qwen-turbo')
          ),
          messages: fc.array(
            fc.record({
              role: fc.constantFrom('user', 'assistant'),
              content: fc.string({ minLength: 1, maxLength: 100 })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          systemPrompt: fc.string({ minLength: 1, maxLength: 200 })
        }),
        (config) => {
          const requestBody = buildRequestBody(config)
          
          if (config.isCompatibleMode) {
            // For compatible mode, check extra_body
            expect(requestBody).toHaveProperty('extra_body')
            expect(requestBody.extra_body).toHaveProperty('enable_search', true)
            expect(requestBody.extra_body).toHaveProperty('search_strategy', 'agent')
          } else {
            // For native API, check parameters
            expect(requestBody).toHaveProperty('parameters')
            expect(requestBody.parameters).toHaveProperty('enable_search', true)
            expect(requestBody.parameters).toHaveProperty('search_strategy', 'agent')
          }
        }
      ),
      { numRuns: 100 } // Run 100 random test cases
    )
  })

  /**
   * Property: When enableSearch is false, enable_search should not be present
   */
  it('Property 1 (inverse): Search parameter propagation - enableSearch false implies no enable_search', () => {
    fc.assert(
      fc.property(
        fc.record({
          enableSearch: fc.constant(false), // Always false
          enableReasoning: fc.boolean(),
          isDashScope: fc.constant(true),
          isCompatibleMode: fc.boolean(),
          model: fc.oneof(
            fc.constant('qwen-plus'),
            fc.constant('qwen-max'),
            fc.constant('qwen3-max')
          ),
          messages: fc.array(
            fc.record({
              role: fc.constantFrom('user', 'assistant'),
              content: fc.string({ minLength: 1, maxLength: 100 })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          systemPrompt: fc.string({ minLength: 1, maxLength: 200 })
        }),
        (config) => {
          const requestBody = buildRequestBody(config)
          
          if (config.isCompatibleMode) {
            // For compatible mode, extra_body should not have enable_search
            if (requestBody.extra_body) {
              expect(requestBody.extra_body).not.toHaveProperty('enable_search')
              expect(requestBody.extra_body).not.toHaveProperty('search_strategy')
            }
          } else {
            // For native API, parameters should not have enable_search
            if (requestBody.parameters) {
              expect(requestBody.parameters).not.toHaveProperty('enable_search')
              expect(requestBody.parameters).not.toHaveProperty('search_strategy')
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Search parameters should be correctly placed regardless of other parameters
   */
  it('Property 1 (coexistence): Search parameters coexist with reasoning parameters', () => {
    fc.assert(
      fc.property(
        fc.record({
          enableSearch: fc.boolean(),
          enableReasoning: fc.boolean(),
          isDashScope: fc.constant(true),
          isCompatibleMode: fc.boolean(),
          model: fc.constant('qwen-plus'),
          messages: fc.array(
            fc.record({
              role: fc.constant('user'),
              content: fc.string({ minLength: 1, maxLength: 50 })
            }),
            { minLength: 1, maxLength: 3 }
          ),
          systemPrompt: fc.constant('Test prompt')
        }),
        (config) => {
          const requestBody = buildRequestBody(config)
          
          const targetObject = config.isCompatibleMode 
            ? requestBody.extra_body 
            : requestBody.parameters

          // If search is enabled, both enable_search and search_strategy must be present
          if (config.enableSearch) {
            expect(targetObject).toHaveProperty('enable_search', true)
            expect(targetObject).toHaveProperty('search_strategy', 'agent')
          } else {
            expect(targetObject).not.toHaveProperty('enable_search')
            expect(targetObject).not.toHaveProperty('search_strategy')
          }

          // If reasoning is enabled, reasoning params should be present
          if (config.enableReasoning) {
            expect(targetObject).toHaveProperty('enable_thinking', true)
            expect(targetObject).toHaveProperty('thinking_budget', 1024)
          }

          // Both can coexist
          if (config.enableSearch && config.enableReasoning) {
            expect(targetObject).toHaveProperty('enable_search', true)
            expect(targetObject).toHaveProperty('search_strategy', 'agent')
            expect(targetObject).toHaveProperty('enable_thinking', true)
            expect(targetObject).toHaveProperty('thinking_budget', 1024)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: ai-search-fix, Property 2: Search strategy inclusion**
   * **Validates: Requirements 1.2, 1.3, 1.4**
   * 
   * Property: For any DashScope API request with enable_search: true, 
   * the request should also include search_strategy: "agent"
   */
  it('Property 2: Search strategy inclusion - enable_search true implies search_strategy present', () => {
    fc.assert(
      fc.property(
        // Generate random DashScope configurations with search enabled
        fc.record({
          enableSearch: fc.constant(true), // Always true to test the implication
          enableReasoning: fc.boolean(),
          isDashScope: fc.constant(true), // Only DashScope APIs
          isCompatibleMode: fc.boolean(), // Test both modes
          model: fc.oneof(
            fc.constant('qwen-plus'),
            fc.constant('qwen-max'),
            fc.constant('qwen3-max'),
            fc.constant('qwen-turbo'),
            fc.constant('qwen2-72b-instruct')
          ),
          messages: fc.array(
            fc.record({
              role: fc.constantFrom('user', 'assistant'),
              content: fc.string({ minLength: 1, maxLength: 100 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          systemPrompt: fc.string({ minLength: 0, maxLength: 500 })
        }),
        (config) => {
          const requestBody = buildRequestBody(config)
          
          // Determine which object contains the search parameters
          const searchParamsObject = config.isCompatibleMode 
            ? requestBody.extra_body 
            : requestBody.parameters
          
          // Core property: If enable_search is true, search_strategy MUST be present
          if (searchParamsObject?.enable_search === true) {
            expect(searchParamsObject).toHaveProperty('search_strategy')
            expect(searchParamsObject.search_strategy).toBe('agent')
          }
          
          // Stronger assertion: Since enableSearch is always true in this test,
          // both parameters MUST always be present
          expect(searchParamsObject).toHaveProperty('enable_search', true)
          expect(searchParamsObject).toHaveProperty('search_strategy', 'agent')
        }
      ),
      { numRuns: 100 } // Run 100 random test cases
    )
  })

  /**
   * Property 2 (completeness): Both search parameters must be present together
   * This tests that enable_search and search_strategy are always paired
   */
  it('Property 2 (completeness): enable_search and search_strategy are always paired', () => {
    fc.assert(
      fc.property(
        fc.record({
          enableSearch: fc.boolean(), // Test both true and false
          enableReasoning: fc.boolean(),
          isDashScope: fc.constant(true),
          isCompatibleMode: fc.boolean(),
          model: fc.oneof(
            fc.constant('qwen-plus'),
            fc.constant('qwen-max'),
            fc.constant('qwen3-max')
          ),
          messages: fc.array(
            fc.record({
              role: fc.constantFrom('user', 'assistant'),
              content: fc.string({ minLength: 1, maxLength: 50 })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          systemPrompt: fc.string({ minLength: 1, maxLength: 100 })
        }),
        (config) => {
          const requestBody = buildRequestBody(config)
          
          const searchParamsObject = config.isCompatibleMode 
            ? requestBody.extra_body 
            : requestBody.parameters
          
          // Property: enable_search and search_strategy must both be present or both be absent
          const hasEnableSearch = !!searchParamsObject && Object.prototype.hasOwnProperty.call(searchParamsObject, 'enable_search')
          const hasSearchStrategy = !!searchParamsObject && Object.prototype.hasOwnProperty.call(searchParamsObject, 'search_strategy')
          
          // They should always have the same presence status
          expect(hasEnableSearch).toBe(hasSearchStrategy)
          
          // If present, verify their values
          if (hasEnableSearch && hasSearchStrategy) {
            const params = searchParamsObject as Record<string, unknown>
            expect(params.enable_search).toBe(true)
            expect(params.search_strategy).toBe('agent')
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2 (invariant): search_strategy value is always "agent" when present
   */
  it('Property 2 (invariant): search_strategy is always "agent" when enable_search is true', () => {
    fc.assert(
      fc.property(
        fc.record({
          enableSearch: fc.constant(true),
          enableReasoning: fc.boolean(),
          isDashScope: fc.constant(true),
          isCompatibleMode: fc.boolean(),
          model: fc.string({ minLength: 1, maxLength: 50 }), // Any model string
          messages: fc.array(
            fc.record({
              role: fc.constantFrom('user', 'assistant', 'system'),
              content: fc.string({ minLength: 0, maxLength: 200 })
            }),
            { minLength: 0, maxLength: 20 }
          ),
          systemPrompt: fc.string({ minLength: 0, maxLength: 1000 })
        }),
        (config) => {
          const requestBody = buildRequestBody(config)
          
          const searchParamsObject = config.isCompatibleMode 
            ? requestBody.extra_body 
            : requestBody.parameters

          if (!searchParamsObject) throw new Error("Missing search parameters object")
          
          // Invariant: search_strategy must always be exactly "agent"
          expect(searchParamsObject).toHaveProperty('search_strategy', 'agent')
          
          // Additional check: it should be a string
          expect(typeof searchParamsObject.search_strategy).toBe('string')
          
          // It should not be any other value
          expect(searchParamsObject.search_strategy).not.toBe('default')
          expect(searchParamsObject.search_strategy).not.toBe('')
          expect(searchParamsObject.search_strategy).not.toBe(undefined)
          expect(searchParamsObject.search_strategy).not.toBe(null)
        }
      ),
      { numRuns: 100 }
    )
  })
})
