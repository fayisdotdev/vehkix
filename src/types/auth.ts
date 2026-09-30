export type AuthMode = 'sign-in' | 'sign-up'

export interface AuthValues {
  username: string
  email: string
  password: string
}

export interface AuthFeedback {
  kind: 'error' | 'success'
  message: string
}
