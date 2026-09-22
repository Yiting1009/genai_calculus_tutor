import { api } from '../../api.js'

const questions = new Map()
const requests = new Map()
const seenQuestions = new Map()

function cacheKey({ topic, type, difficulty, language }) {
  return JSON.stringify([topic, type, difficulty, language])
}

export function getCachedQuestion(params) {
  return questions.get(cacheKey(params)) || null
}

export function loadQuestion(params, { fresh = false } = {}) {
  const key = cacheKey(params)
  const cached = questions.get(key)
  if (!fresh && cached) return Promise.resolve(cached)

  const pending = requests.get(key)
  if (!fresh && pending) return pending

  const previous = seenQuestions.get(key) || []
  const request = api.generateQuestion({
    ...params,
    exclude_stems: previous,
  }).then((question) => {
    questions.set(key, question)
    seenQuestions.set(key, [...previous, question.stem].slice(-50))
    return question
  }).finally(() => {
    if (requests.get(key) === request) requests.delete(key)
  })

  requests.set(key, request)
  return request
}

export function prefetchQuestion(params) {
  return loadQuestion(params).catch(() => null)
}
