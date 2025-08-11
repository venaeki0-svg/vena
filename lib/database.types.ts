export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          role: string
          permissions: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          role?: string
          permissions?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: string
          permissions?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          name: string
          email: string
          phone: string
          instagram: string | null
          since: string
          status: string
          client_type: string
          last_contact: string
          portal_access_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone: string
          instagram?: string | null
          since: string
          status: string
          client_type: string
          last_contact: string
          portal_access_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string
          instagram?: string | null
          since?: string
          status?: string
          client_type?: string
          last_contact?: string
          portal_access_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          project_name: string
          client_name: string
          client_id: string
          project_type: string
          package_name: string
          package_id: string
          add_ons: Json
          date: string
          deadline_date: string | null
          location: string
          progress: number
          status: string
          active_sub_statuses: string[] | null
          total_cost: number
          amount_paid: number
          payment_status: string
          team: Json
          notes: string | null
          accommodation: string | null
          drive_link: string | null
          client_drive_link: string | null
          final_drive_link: string | null
          start_time: string | null
          end_time: string | null
          image: string | null
          revisions: Json | null
          promo_code_id: string | null
          discount_amount: number | null
          shipping_details: string | null
          dp_proof_url: string | null
          printing_details: Json | null
          printing_cost: number | null
          transport_cost: number | null
          is_editing_confirmed_by_client: boolean | null
          is_printing_confirmed_by_client: boolean | null
          is_delivery_confirmed_by_client: boolean | null
          confirmed_sub_statuses: string[] | null
          client_sub_status_notes: Json | null
          completed_digital_items: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_name: string
          client_name: string
          client_id: string
          project_type: string
          package_name: string
          package_id: string
          add_ons?: Json
          date: string
          deadline_date?: string | null
          location: string
          progress?: number
          status: string
          active_sub_statuses?: string[] | null
          total_cost: number
          amount_paid?: number
          payment_status: string
          team?: Json
          notes?: string | null
          accommodation?: string | null
          drive_link?: string | null
          client_drive_link?: string | null
          final_drive_link?: string | null
          start_time?: string | null
          end_time?: string | null
          image?: string | null
          revisions?: Json | null
          promo_code_id?: string | null
          discount_amount?: number | null
          shipping_details?: string | null
          dp_proof_url?: string | null
          printing_details?: Json | null
          printing_cost?: number | null
          transport_cost?: number | null
          is_editing_confirmed_by_client?: boolean | null
          is_printing_confirmed_by_client?: boolean | null
          is_delivery_confirmed_by_client?: boolean | null
          confirmed_sub_statuses?: string[] | null
          client_sub_status_notes?: Json | null
          completed_digital_items?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_name?: string
          client_name?: string
          client_id?: string
          project_type?: string
          package_name?: string
          package_id?: string
          add_ons?: Json
          date?: string
          deadline_date?: string | null
          location?: string
          progress?: number
          status?: string
          active_sub_statuses?: string[] | null
          total_cost?: number
          amount_paid?: number
          payment_status?: string
          team?: Json
          notes?: string | null
          accommodation?: string | null
          drive_link?: string | null
          client_drive_link?: string | null
          final_drive_link?: string | null
          start_time?: string | null
          end_time?: string | null
          image?: string | null
          revisions?: Json | null
          promo_code_id?: string | null
          discount_amount?: number | null
          shipping_details?: string | null
          dp_proof_url?: string | null
          printing_details?: Json | null
          printing_cost?: number | null
          transport_cost?: number | null
          is_editing_confirmed_by_client?: boolean | null
          is_printing_confirmed_by_client?: boolean | null
          is_delivery_confirmed_by_client?: boolean | null
          confirmed_sub_statuses?: string[] | null
          client_sub_status_notes?: Json | null
          completed_digital_items?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      packages: {
        Row: {
          id: string
          name: string
          price: number
          physical_items: Json
          digital_items: string[]
          processing_time: string
          photographers: string | null
          videographers: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          price: number
          physical_items?: Json
          digital_items: string[]
          processing_time: string
          photographers?: string | null
          videographers?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          price?: number
          physical_items?: Json
          digital_items?: string[]
          processing_time?: string
          photographers?: string | null
          videographers?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          date: string
          description: string
          amount: number
          type: string
          project_id: string | null
          category: string
          method: string
          pocket_id: string | null
          card_id: string | null
          printing_item_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          date: string
          description: string
          amount: number
          type: string
          project_id?: string | null
          category: string
          method: string
          pocket_id?: string | null
          card_id?: string | null
          printing_item_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          date?: string
          description?: string
          amount?: number
          type?: string
          project_id?: string | null
          category?: string
          method?: string
          pocket_id?: string | null
          card_id?: string | null
          printing_item_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}