export type AdminSection = 'overview' | 'users' | 'vehicles' | 'form' | 'details' | 'share'

export interface AdminAccount {
	id: string
	username: string
	email: string | null
	vehicleCount: number
}