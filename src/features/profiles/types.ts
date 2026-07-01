export interface DeliveryProfile {
  id: string
  username: string
  displayName: string
  active: boolean
}

export interface CreateProfileInput {
  username: string
  displayName: string
  password: string
}

export interface UpdateProfileInput {
  username?: string
  displayName?: string
  password?: string
}
