export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      driver_location_history: {
        Row: {
          heading: number | null
          id: string
          lat: number
          lng: number
          profile_id: string
          recorded_at: string
          ride_id: string | null
          speed: number | null
        }
        Insert: {
          heading?: number | null
          id?: string
          lat: number
          lng: number
          profile_id: string
          recorded_at?: string
          ride_id?: string | null
          speed?: number | null
        }
        Update: {
          heading?: number | null
          id?: string
          lat?: number
          lng?: number
          profile_id?: string
          recorded_at?: string
          ride_id?: string | null
          speed?: number | null
        }
        Relationships: []
      }
      gas_stations: {
        Row: {
          active: boolean
          address: string
          created_at: string
          discount_note: string | null
          id: string
          lat: number
          lng: number
          logo_url: string | null
          name: string
        }
        Insert: {
          active?: boolean
          address: string
          created_at?: string
          discount_note?: string | null
          id?: string
          lat: number
          lng: number
          logo_url?: string | null
          name: string
        }
        Update: {
          active?: boolean
          address?: string
          created_at?: string
          discount_note?: string | null
          id?: string
          lat?: number
          lng?: number
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          id: string
          notification_id: string
          profile_id: string
          read_at: string
        }
        Insert: {
          id?: string
          notification_id: string
          profile_id: string
          read_at?: string
        }
        Update: {
          id?: string
          notification_id?: string
          profile_id?: string
          read_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_reads_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_reads_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_global: boolean
          is_read: boolean
          message: string
          profile_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_global?: boolean
          is_read?: boolean
          message: string
          profile_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          is_global?: boolean
          is_read?: boolean
          message?: string
          profile_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      page_views: {
        Row: {
          created_at: string
          id: string
          path: string
          profile_id: string | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          path: string
          profile_id?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          path?: string
          profile_id?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          admin_note: string | null
          amount: number
          bank_iban: string | null
          created_at: string
          driver_id: string
          id: string
          note: string | null
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          bank_iban?: string | null
          created_at?: string
          driver_id: string
          id?: string
          note?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          bank_iban?: string | null
          created_at?: string
          driver_id?: string
          id?: string
          note?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: number
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: number
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          badge: string | null
          ban_reason: string | null
          banned: boolean | null
          banned_at: string | null
          bio: string | null
          car_color: string | null
          car_model: string | null
          created_at: string
          full_name: string
          id: string
          license_plate: string | null
          phone: string | null
          privacy_accepted_at: string | null
          privacy_version: string | null
          rating: number | null
          selected_role: Database["public"]["Enums"]["user_role"] | null
          terms_accepted_at: string | null
          terms_version: string | null
          total_rides: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          badge?: string | null
          ban_reason?: string | null
          banned?: boolean | null
          banned_at?: string | null
          bio?: string | null
          car_color?: string | null
          car_model?: string | null
          created_at?: string
          full_name: string
          id?: string
          license_plate?: string | null
          phone?: string | null
          privacy_accepted_at?: string | null
          privacy_version?: string | null
          rating?: number | null
          selected_role?: Database["public"]["Enums"]["user_role"] | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          total_rides?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          badge?: string | null
          ban_reason?: string | null
          banned?: boolean | null
          banned_at?: string | null
          bio?: string | null
          car_color?: string | null
          car_model?: string | null
          created_at?: string
          full_name?: string
          id?: string
          license_plate?: string | null
          phone?: string | null
          privacy_accepted_at?: string | null
          privacy_version?: string | null
          rating?: number | null
          selected_role?: Database["public"]["Enums"]["user_role"] | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          total_rides?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      public_chat_messages: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          message: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          message: string
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          message?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_chat_messages_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_chat_messages_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rated_user_id: string
          rater_id: string
          rating: number
          ride_request_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rated_user_id: string
          rater_id: string
          rating: number
          ride_request_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rated_user_id?: string
          rater_id?: string
          rating?: number
          ride_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ratings_rated_user_id_fkey"
            columns: ["rated_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rated_user_id_fkey"
            columns: ["rated_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_ride_request_id_fkey"
            columns: ["ride_request_id"]
            isOneToOne: true
            referencedRelation: "ride_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reason: string
          reported_user_id: string
          reporter_id: string
          ride_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reported_user_id: string
          reporter_id: string
          ride_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          ride_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_gas_stops: {
        Row: {
          created_at: string
          gas_station_id: string
          id: string
          ride_id: string
          stopped_at: string
          stopped_by: string
        }
        Insert: {
          created_at?: string
          gas_station_id: string
          id?: string
          ride_id: string
          stopped_at?: string
          stopped_by: string
        }
        Update: {
          created_at?: string
          gas_station_id?: string
          id?: string
          ride_id?: string
          stopped_at?: string
          stopped_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_gas_stops_gas_station_id_fkey"
            columns: ["gas_station_id"]
            isOneToOne: false
            referencedRelation: "gas_stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_gas_stops_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_requests: {
        Row: {
          amount_paid: number | null
          cancellation_reason: string | null
          cancelled_at: string | null
          commission_amount: number | null
          created_at: string
          currency: string | null
          driver_confirmed_at: string | null
          driver_near_notified_at: string | null
          driver_payout_amount: number | null
          dropoff_address: string | null
          dropoff_lat: number | null
          dropoff_lng: number | null
          id: string
          message: string | null
          paid_at: string | null
          passenger_confirmed_at: string | null
          passenger_id: string
          payment_status: string
          payout_released_at: string | null
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          pin_code: string | null
          pin_used: boolean
          pin_verified_at: string | null
          price_per_seat_snapshot: number | null
          refunded_at: string | null
          ride_id: string
          status: Database["public"]["Enums"]["request_status"] | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          commission_amount?: number | null
          created_at?: string
          currency?: string | null
          driver_confirmed_at?: string | null
          driver_near_notified_at?: string | null
          driver_payout_amount?: number | null
          dropoff_address?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          id?: string
          message?: string | null
          paid_at?: string | null
          passenger_confirmed_at?: string | null
          passenger_id: string
          payment_status?: string
          payout_released_at?: string | null
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          pin_code?: string | null
          pin_used?: boolean
          pin_verified_at?: string | null
          price_per_seat_snapshot?: number | null
          refunded_at?: string | null
          ride_id: string
          status?: Database["public"]["Enums"]["request_status"] | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          commission_amount?: number | null
          created_at?: string
          currency?: string | null
          driver_confirmed_at?: string | null
          driver_near_notified_at?: string | null
          driver_payout_amount?: number | null
          dropoff_address?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          id?: string
          message?: string | null
          paid_at?: string | null
          passenger_confirmed_at?: string | null
          passenger_id?: string
          payment_status?: string
          payout_released_at?: string | null
          pickup_address?: string
          pickup_lat?: number
          pickup_lng?: number
          pin_code?: string | null
          pin_used?: boolean
          pin_verified_at?: string | null
          price_per_seat_snapshot?: number | null
          refunded_at?: string | null
          ride_id?: string
          status?: Database["public"]["Enums"]["request_status"] | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_requests_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_requests_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_requests_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_stops: {
        Row: {
          address: string
          created_at: string
          id: string
          lat: number
          lng: number
          ride_id: string
          stop_order: number
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          lat: number
          lng: number
          ride_id: string
          stop_order: number
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          ride_id?: string
          stop_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "ride_stops_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_templates: {
        Row: {
          ac_allowed: boolean | null
          active: boolean
          available_seats: number
          created_at: string
          departure_time: string
          destination_address: string
          destination_lat: number
          destination_lng: number
          driver_id: string
          food_allowed: boolean | null
          id: string
          last_generated_date: string | null
          luggage_allowed: boolean | null
          max_detour_km: number
          music_allowed: boolean | null
          origin_address: string
          origin_lat: number
          origin_lng: number
          pets_allowed: boolean | null
          price_per_seat: number
          smoking_allowed: boolean | null
          updated_at: string
          weekdays: number[]
        }
        Insert: {
          ac_allowed?: boolean | null
          active?: boolean
          available_seats?: number
          created_at?: string
          departure_time: string
          destination_address: string
          destination_lat: number
          destination_lng: number
          driver_id: string
          food_allowed?: boolean | null
          id?: string
          last_generated_date?: string | null
          luggage_allowed?: boolean | null
          max_detour_km?: number
          music_allowed?: boolean | null
          origin_address: string
          origin_lat: number
          origin_lng: number
          pets_allowed?: boolean | null
          price_per_seat: number
          smoking_allowed?: boolean | null
          updated_at?: string
          weekdays: number[]
        }
        Update: {
          ac_allowed?: boolean | null
          active?: boolean
          available_seats?: number
          created_at?: string
          departure_time?: string
          destination_address?: string
          destination_lat?: number
          destination_lng?: number
          driver_id?: string
          food_allowed?: boolean | null
          id?: string
          last_generated_date?: string | null
          luggage_allowed?: boolean | null
          max_detour_km?: number
          music_allowed?: boolean | null
          origin_address?: string
          origin_lat?: number
          origin_lng?: number
          pets_allowed?: boolean | null
          price_per_seat?: number
          smoking_allowed?: boolean | null
          updated_at?: string
          weekdays?: number[]
        }
        Relationships: []
      }
      rides: {
        Row: {
          ac_allowed: boolean | null
          available_seats: number
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          departure_time: string
          destination_address: string
          destination_lat: number
          destination_lng: number
          driver_id: string
          food_allowed: boolean | null
          gas_station_id: string | null
          id: string
          luggage_allowed: boolean | null
          max_detour_km: number
          music_allowed: boolean | null
          origin_address: string
          origin_lat: number
          origin_lng: number
          pets_allowed: boolean | null
          price_per_seat: number
          route_polyline: string | null
          smoking_allowed: boolean | null
          status: Database["public"]["Enums"]["ride_status"] | null
          template_id: string | null
          university_id: string | null
          updated_at: string
        }
        Insert: {
          ac_allowed?: boolean | null
          available_seats?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          departure_time: string
          destination_address: string
          destination_lat: number
          destination_lng: number
          driver_id: string
          food_allowed?: boolean | null
          gas_station_id?: string | null
          id?: string
          luggage_allowed?: boolean | null
          max_detour_km?: number
          music_allowed?: boolean | null
          origin_address: string
          origin_lat: number
          origin_lng: number
          pets_allowed?: boolean | null
          price_per_seat: number
          route_polyline?: string | null
          smoking_allowed?: boolean | null
          status?: Database["public"]["Enums"]["ride_status"] | null
          template_id?: string | null
          university_id?: string | null
          updated_at?: string
        }
        Update: {
          ac_allowed?: boolean | null
          available_seats?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          departure_time?: string
          destination_address?: string
          destination_lat?: number
          destination_lng?: number
          driver_id?: string
          food_allowed?: boolean | null
          gas_station_id?: string | null
          id?: string
          luggage_allowed?: boolean | null
          max_detour_km?: number
          music_allowed?: boolean | null
          origin_address?: string
          origin_lat?: number
          origin_lng?: number
          pets_allowed?: boolean | null
          price_per_seat?: number
          route_polyline?: string | null
          smoking_allowed?: boolean | null
          status?: Database["public"]["Enums"]["ride_status"] | null
          template_id?: string | null
          university_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rides_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_gas_station_id_fkey"
            columns: ["gas_station_id"]
            isOneToOne: false
            referencedRelation: "gas_stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      route_alerts: {
        Row: {
          active: boolean
          created_at: string
          destination_text: string
          id: string
          max_price: number | null
          origin_text: string
          passenger_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          destination_text: string
          id?: string
          max_price?: number | null
          origin_text: string
          passenger_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          destination_text?: string
          id?: string
          max_price?: number | null
          origin_text?: string
          passenger_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          fee: number | null
          id: string
          ride_id: string | null
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          fee?: number | null
          id?: string
          ride_id?: string | null
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          fee?: number | null
          id?: string
          ride_id?: string | null
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      universities: {
        Row: {
          active: boolean
          city: string | null
          code: string
          color: string | null
          created_at: string
          email_domain: string
          id: string
          logo_url: string | null
          name: string
          short_name: string
        }
        Insert: {
          active?: boolean
          city?: string | null
          code: string
          color?: string | null
          created_at?: string
          email_domain: string
          id?: string
          logo_url?: string | null
          name: string
          short_name: string
        }
        Update: {
          active?: boolean
          city?: string | null
          code?: string
          color?: string | null
          created_at?: string
          email_domain?: string
          id?: string
          logo_url?: string | null
          name?: string
          short_name?: string
        }
        Relationships: []
      }
      university_email_verifications: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          profile_id: string
          university_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          profile_id: string
          university_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          profile_id?: string
          university_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "university_email_verifications_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      university_memberships: {
        Row: {
          id: string
          profile_id: string
          university_id: string
          verified_at: string
          verified_email: string
        }
        Insert: {
          id?: string
          profile_id: string
          university_id: string
          verified_at?: string
          verified_email: string
        }
        Update: {
          id?: string
          profile_id?: string
          university_id?: string
          verified_at?: string
          verified_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "university_memberships_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_locations: {
        Row: {
          heading: number | null
          id: string
          lat: number
          lng: number
          profile_id: string
          speed: number | null
          updated_at: string
        }
        Insert: {
          heading?: number | null
          id?: string
          lat: number
          lng: number
          profile_id: string
          speed?: number | null
          updated_at?: string
        }
        Update: {
          heading?: number | null
          id?: string
          lat?: number
          lng?: number
          profile_id?: string
          speed?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_locations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_locations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          car_color: string | null
          car_model: string
          created_at: string
          id: string
          is_default: boolean
          label: string | null
          license_plate: string | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          car_color?: string | null
          car_model: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          license_plate?: string | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          car_color?: string | null
          car_model?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          license_plate?: string | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          pending_payout_amount: number
          profile_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          pending_payout_amount?: number
          profile_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          pending_payout_amount?: number
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          badge: string | null
          bio: string | null
          car_color: string | null
          car_model: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          rating: number | null
          selected_role: Database["public"]["Enums"]["user_role"] | null
          total_rides: number | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          badge?: string | null
          bio?: string | null
          car_color?: string | null
          car_model?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          rating?: number | null
          selected_role?: Database["public"]["Enums"]["user_role"] | null
          total_rides?: number | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          badge?: string | null
          bio?: string | null
          car_color?: string | null
          car_model?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          rating?: number | null
          selected_role?: Database["public"]["Enums"]["user_role"] | null
          total_rides?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_old_location_history: { Args: never; Returns: undefined }
      current_profile_id: { Args: never; Returns: string }
      get_internal_push_secret: { Args: never; Returns: string }
      has_ride_request: { Args: { _ride_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_ride_driver: { Args: { _ride_id: string }; Returns: boolean }
      is_university_member: {
        Args: { _university_id: string }
        Returns: boolean
      }
      send_push_via_edge: {
        Args: {
          _body: string
          _data?: Json
          _profile_id: string
          _title: string
        }
        Returns: undefined
      }
      verify_ride_request_pin: {
        Args: { _pin: string; _request_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
      request_status:
        | "pending"
        | "accepted"
        | "driver_arrived"
        | "rejected"
        | "picked_up"
        | "completed"
        | "cancelled"
      ride_status: "active" | "in_progress" | "completed" | "cancelled"
      user_role: "driver" | "passenger"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      request_status: [
        "pending",
        "accepted",
        "driver_arrived",
        "rejected",
        "picked_up",
        "completed",
        "cancelled",
      ],
      ride_status: ["active", "in_progress", "completed", "cancelled"],
      user_role: ["driver", "passenger"],
    },
  },
} as const
