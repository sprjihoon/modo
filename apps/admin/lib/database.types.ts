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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      action_logs: {
        Row: {
          action_type: Database["public"]["Enums"]["action_type"]
          actor_id: string
          actor_name: string
          actor_role: string
          log_id: string
          metadata: Json | null
          target_id: string | null
          timestamp: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["action_type"]
          actor_id: string
          actor_name: string
          actor_role: string
          log_id?: string
          metadata?: Json | null
          target_id?: string | null
          timestamp?: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["action_type"]
          actor_id?: string
          actor_name?: string
          actor_role?: string
          log_id?: string
          metadata?: Json | null
          target_id?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      addresses: {
        Row: {
          address: string
          address_detail: string | null
          created_at: string
          id: string
          is_default: boolean
          label: string | null
          recipient_name: string
          recipient_phone: string
          updated_at: string
          user_id: string
          zipcode: string
        }
        Insert: {
          address: string
          address_detail?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          recipient_name: string
          recipient_phone: string
          updated_at?: string
          user_id: string
          zipcode: string
        }
        Update: {
          address?: string
          address_detail?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          recipient_name?: string
          recipient_phone?: string
          updated_at?: string
          user_id?: string
          zipcode?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          image_url: string | null
          is_pinned: boolean | null
          link_url: string | null
          push_failed_count: number | null
          push_sent_count: number | null
          scheduled_at: string | null
          send_push: boolean | null
          sent_at: string | null
          status: string
          target_audience: string | null
          title: string
          total_recipients: number | null
          type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_pinned?: boolean | null
          link_url?: string | null
          push_failed_count?: number | null
          push_sent_count?: number | null
          scheduled_at?: string | null
          send_push?: boolean | null
          sent_at?: string | null
          status?: string
          target_audience?: string | null
          title: string
          total_recipients?: number | null
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_pinned?: boolean | null
          link_url?: string | null
          push_failed_count?: number | null
          push_sent_count?: number | null
          scheduled_at?: string | null
          send_push?: boolean | null
          sent_at?: string | null
          status?: string
          target_audience?: string | null
          title?: string
          total_recipients?: number | null
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      app_contents: {
        Row: {
          content: string | null
          created_at: string
          id: string
          images: Json | null
          key: string
          metadata: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          images?: Json | null
          key: string
          metadata?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          images?: Json | null
          key?: string
          metadata?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          action_type: string | null
          action_value: string | null
          background_color: string
          background_image_url: string | null
          button_text: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          action_type?: string | null
          action_value?: string | null
          background_color: string
          background_image_url?: string | null
          button_text: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          action_type?: string | null
          action_value?: string | null
          background_color?: string
          background_image_url?: string | null
          button_text?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      popups: {
        Row: {
          id: string
          subtitle: string | null
          title: string
          highlight_text: string | null
          items: Json
          cta_text: string
          dismiss_label: string
          dismiss_hours: number
          is_active: boolean
          starts_at: string | null
          ends_at: string | null
          display_priority: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          subtitle?: string | null
          title: string
          highlight_text?: string | null
          items?: Json
          cta_text?: string
          dismiss_label?: string
          dismiss_hours?: number
          is_active?: boolean
          starts_at?: string | null
          ends_at?: string | null
          display_priority?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          subtitle?: string | null
          title?: string
          highlight_text?: string | null
          items?: Json
          cta_text?: string
          dismiss_label?: string
          dismiss_hours?: number
          is_active?: boolean
          starts_at?: string | null
          ends_at?: string | null
          display_priority?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          id: string
          question: string
          answer: string
          display_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          question: string
          answer: string
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          question?: string
          answer?: string
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      cart_drafts: {
        Row: {
          created_at: string
          draft_data: Json
          id: string
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          draft_data: Json
          id?: string
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          draft_data?: Json
          id?: string
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_drafts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      company_info: {
        Row: {
          address: string
          business_number: string
          ceo_name: string
          company_name: string
          created_at: string
          daily_order_limit: number | null
          email: string | null
          footer_header: string | null
          header_title: string | null
          id: string
          label_background_image_url: string | null
          label_layout_config: string | null
          online_business_number: string | null
          operating_hours_lunch: string | null
          operating_hours_weekday: string | null
          operating_hours_weekend: string | null
          order_limit_message: string | null
          order_limit_title: string | null
          phone: string | null
          privacy_officer: string | null
          updated_at: string
        }
        Insert: {
          address: string
          business_number: string
          ceo_name: string
          company_name: string
          created_at?: string
          daily_order_limit?: number | null
          email?: string | null
          footer_header?: string | null
          header_title?: string | null
          id?: string
          label_background_image_url?: string | null
          label_layout_config?: string | null
          online_business_number?: string | null
          operating_hours_lunch?: string | null
          operating_hours_weekday?: string | null
          operating_hours_weekend?: string | null
          order_limit_message?: string | null
          order_limit_title?: string | null
          phone?: string | null
          privacy_officer?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          business_number?: string
          ceo_name?: string
          company_name?: string
          created_at?: string
          daily_order_limit?: number | null
          email?: string | null
          footer_header?: string | null
          header_title?: string | null
          id?: string
          label_background_image_url?: string | null
          label_layout_config?: string | null
          online_business_number?: string | null
          operating_hours_lunch?: string | null
          operating_hours_weekday?: string | null
          operating_hours_weekend?: string | null
          order_limit_message?: string | null
          order_limit_title?: string | null
          phone?: string | null
          privacy_officer?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customer_events: {
        Row: {
          app_version: string | null
          city: string | null
          country: string | null
          created_at: string
          device_model: string | null
          device_os: string | null
          device_type: string | null
          event_id: string
          event_name: string | null
          event_type: Database["public"]["Enums"]["customer_event_type"]
          ip_address: string | null
          metadata: Json | null
          page_title: string | null
          page_url: string | null
          referrer: string | null
          session_id: string | null
          target_id: string | null
          target_type: string | null
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_model?: string | null
          device_os?: string | null
          device_type?: string | null
          event_id?: string
          event_name?: string | null
          event_type: Database["public"]["Enums"]["customer_event_type"]
          ip_address?: string | null
          metadata?: Json | null
          page_title?: string | null
          page_url?: string | null
          referrer?: string | null
          session_id?: string | null
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_model?: string | null
          device_os?: string | null
          device_type?: string | null
          event_id?: string
          event_name?: string | null
          event_type?: Database["public"]["Enums"]["customer_event_type"]
          ip_address?: string | null
          metadata?: Json | null
          page_title?: string | null
          page_url?: string | null
          referrer?: string | null
          session_id?: string | null
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_codes: {
        Row: {
          arr_cnpo_nm: string
          course_no: string | null
          created_at: string | null
          deliv_po_nm: string
          sort_code_1: string
          sort_code_2: string
          sort_code_3: string
          sort_code_4: string
          updated_at: string | null
          zipcode: string
        }
        Insert: {
          arr_cnpo_nm: string
          course_no?: string | null
          created_at?: string | null
          deliv_po_nm: string
          sort_code_1: string
          sort_code_2: string
          sort_code_3: string
          sort_code_4: string
          updated_at?: string | null
          zipcode: string
        }
        Update: {
          arr_cnpo_nm?: string
          course_no?: string | null
          created_at?: string | null
          deliv_po_nm?: string
          sort_code_1?: string
          sort_code_2?: string
          sort_code_3?: string
          sort_code_4?: string
          updated_at?: string | null
          zipcode?: string
        }
        Relationships: []
      }
      epost_test_logs: {
        Row: {
          appr_no: string | null
          cancel_response: Json | null
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          delivery_message: string | null
          goods_name: string | null
          id: string
          micro_yn: string | null
          note: string | null
          pay_type: string
          price: string | null
          raw_request: Json | null
          raw_response: Json | null
          receiver_address: string
          receiver_address_detail: string | null
          receiver_name: string
          receiver_phone: string
          receiver_zipcode: string
          regi_po_nm: string | null
          req_no: string | null
          req_type: string | null
          res_date: string | null
          res_no: string | null
          sender_address: string
          sender_address_detail: string | null
          sender_name: string
          sender_phone: string
          sender_zipcode: string
          shipment_type: string
          size_preset: string | null
          status: string
          tracking_no: string | null
          volume_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          appr_no?: string | null
          cancel_response?: Json | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          delivery_message?: string | null
          goods_name?: string | null
          id?: string
          micro_yn?: string | null
          note?: string | null
          pay_type: string
          price?: string | null
          raw_request?: Json | null
          raw_response?: Json | null
          receiver_address: string
          receiver_address_detail?: string | null
          receiver_name: string
          receiver_phone: string
          receiver_zipcode: string
          regi_po_nm?: string | null
          req_no?: string | null
          req_type?: string | null
          res_date?: string | null
          res_no?: string | null
          sender_address: string
          sender_address_detail?: string | null
          sender_name: string
          sender_phone: string
          sender_zipcode: string
          shipment_type: string
          size_preset?: string | null
          status?: string
          tracking_no?: string | null
          volume_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          appr_no?: string | null
          cancel_response?: Json | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          delivery_message?: string | null
          goods_name?: string | null
          id?: string
          micro_yn?: string | null
          note?: string | null
          pay_type?: string
          price?: string | null
          raw_request?: Json | null
          raw_response?: Json | null
          receiver_address?: string
          receiver_address_detail?: string | null
          receiver_name?: string
          receiver_phone?: string
          receiver_zipcode?: string
          regi_po_nm?: string | null
          req_no?: string | null
          req_type?: string | null
          res_date?: string | null
          res_no?: string | null
          sender_address?: string
          sender_address_detail?: string | null
          sender_name?: string
          sender_phone?: string
          sender_zipcode?: string
          shipment_type?: string
          size_preset?: string | null
          status?: string
          tracking_no?: string | null
          volume_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      extra_charge_requests: {
        Row: {
          admin_note: string | null
          amount: number | null
          created_at: string | null
          customer_response_at: string | null
          id: string
          order_id: string
          payment_id: string | null
          requested_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string | null
          worker_id: string | null
          worker_reason: string
        }
        Insert: {
          admin_note?: string | null
          amount?: number | null
          created_at?: string | null
          customer_response_at?: string | null
          id?: string
          order_id: string
          payment_id?: string | null
          requested_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          worker_id?: string | null
          worker_reason: string
        }
        Update: {
          admin_note?: string | null
          amount?: number | null
          created_at?: string | null
          customer_response_at?: string | null
          id?: string
          order_id?: string
          payment_id?: string | null
          requested_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          worker_id?: string | null
          worker_reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "extra_charge_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "cancellation_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extra_charge_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extra_charge_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extra_charge_requests_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          created_at: string
          duration_seconds: number | null
          expires_at: string | null
          final_waybill_no: string
          id: string
          path: string
          provider: string
          sequence: number | null
          type: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          expires_at?: string | null
          final_waybill_no: string
          id?: string
          path: string
          provider: string
          sequence?: number | null
          type: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          expires_at?: string | null
          final_waybill_no?: string
          id?: string
          path?: string
          provider?: string
          sequence?: number | null
          type?: string
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          body: string
          category: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          template_key: string
          template_name: string
          title: string
          updated_at: string
          updated_by: string | null
          variables: Json | null
        }
        Insert: {
          body: string
          category: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          template_key: string
          template_name: string
          title: string
          updated_at?: string
          updated_by?: string | null
          variables?: Json | null
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          template_key?: string
          template_name?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_templates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          announcement_id: string | null
          body: string
          created_at: string
          id: string
          is_read: boolean | null
          metadata: Json | null
          order_id: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          announcement_id?: string | null
          body: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          order_id?: string | null
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          announcement_id?: string | null
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          order_id?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "cancellation_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_center_settings: {
        Row: {
          address1: string | null
          address2: string | null
          created_at: string | null
          id: number
          phone: string | null
          recipient_name: string | null
          show_test_buttons: boolean | null
          updated_at: string | null
          zipcode: string | null
        }
        Insert: {
          address1?: string | null
          address2?: string | null
          created_at?: string | null
          id?: number
          phone?: string | null
          recipient_name?: string | null
          show_test_buttons?: boolean | null
          updated_at?: string | null
          zipcode?: string | null
        }
        Update: {
          address1?: string | null
          address2?: string | null
          created_at?: string | null
          id?: number
          phone?: string | null
          recipient_name?: string | null
          show_test_buttons?: boolean | null
          updated_at?: string | null
          zipcode?: string | null
        }
        Relationships: []
      }
      order_waitlist: {
        Row: {
          created_at: string
          fcm_token: string | null
          id: string
          notified_at: string | null
          request_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fcm_token?: string | null
          id?: string
          notified_at?: string | null
          request_date?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fcm_token?: string | null
          id?: string
          notified_at?: string | null
          request_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_waitlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          additional_price: number | null
          base_price: number
          canceled_at: string | null
          cancellation_reason: string | null
          clothing_type: string
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: string | null
          delivery_address_detail: string | null
          delivery_address_updated_at: string | null
          delivery_phone: string | null
          delivery_zipcode: string | null
          extra_charge_data: Json | null
          extra_charge_status: Database["public"]["Enums"]["extra_charge_status"]
          id: string
          image_urls: string[] | null
          images: Json | null
          images_with_pins: Json | null
          item_category: string | null
          item_description: string | null
          item_name: string | null
          notes: string | null
          order_number: string
          original_total_price: number | null
          paid_at: string | null
          payment_id: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          pickup_address: string | null
          pickup_address_detail: string | null
          pickup_date: string | null
          pickup_phone: string | null
          pickup_zipcode: string | null
          promotion_code_id: string | null
          promotion_discount_amount: number | null
          remote_area_fee: number
          repair_detail: string | null
          repair_parts: string[] | null
          repair_type: string
          shipping_discount_amount: number
          shipping_fee: number | null
          shipping_promotion_id: string | null
          status: string
          total_price: number
          tracking_no: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_price?: number | null
          base_price?: number
          canceled_at?: string | null
          cancellation_reason?: string | null
          clothing_type: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_address_detail?: string | null
          delivery_address_updated_at?: string | null
          delivery_phone?: string | null
          delivery_zipcode?: string | null
          extra_charge_data?: Json | null
          extra_charge_status?: Database["public"]["Enums"]["extra_charge_status"]
          id?: string
          image_urls?: string[] | null
          images?: Json | null
          images_with_pins?: Json | null
          item_category?: string | null
          item_description?: string | null
          item_name?: string | null
          notes?: string | null
          order_number: string
          original_total_price?: number | null
          paid_at?: string | null
          payment_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pickup_address?: string | null
          pickup_address_detail?: string | null
          pickup_date?: string | null
          pickup_phone?: string | null
          pickup_zipcode?: string | null
          promotion_code_id?: string | null
          promotion_discount_amount?: number | null
          remote_area_fee?: number
          repair_detail?: string | null
          repair_parts?: string[] | null
          repair_type: string
          shipping_discount_amount?: number
          shipping_fee?: number | null
          shipping_promotion_id?: string | null
          status?: string
          total_price: number
          tracking_no?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_price?: number | null
          base_price?: number
          canceled_at?: string | null
          cancellation_reason?: string | null
          clothing_type?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_address_detail?: string | null
          delivery_address_updated_at?: string | null
          delivery_phone?: string | null
          delivery_zipcode?: string | null
          extra_charge_data?: Json | null
          extra_charge_status?: Database["public"]["Enums"]["extra_charge_status"]
          id?: string
          image_urls?: string[] | null
          images?: Json | null
          images_with_pins?: Json | null
          item_category?: string | null
          item_description?: string | null
          item_name?: string | null
          notes?: string | null
          order_number?: string
          original_total_price?: number | null
          paid_at?: string | null
          payment_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pickup_address?: string | null
          pickup_address_detail?: string | null
          pickup_date?: string | null
          pickup_phone?: string | null
          pickup_zipcode?: string | null
          promotion_code_id?: string | null
          promotion_discount_amount?: number | null
          remote_area_fee?: number
          repair_detail?: string | null
          repair_parts?: string[] | null
          repair_type?: string
          shipping_discount_amount?: number
          shipping_fee?: number | null
          shipping_promotion_id?: string | null
          status?: string
          total_price?: number
          tracking_no?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_promotion_code_id_fkey"
            columns: ["promotion_code_id"]
            isOneToOne: false
            referencedRelation: "promotion_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipping_promotion_id_fkey"
            columns: ["shipping_promotion_id"]
            isOneToOne: false
            referencedRelation: "shipping_promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_intents: {
        Row: {
          consumed_at: string | null
          consumed_order_id: string | null
          created_at: string
          expires_at: string
          id: string
          payload: Json
          total_price: number
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          consumed_order_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          payload: Json
          total_price: number
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          consumed_order_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          payload?: Json
          total_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_intents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_logs: {
        Row: {
          amount: number | null
          approved_at: string | null
          created_at: string
          id: string
          is_extra_charge: boolean | null
          method: string | null
          order_id: string | null
          payment_id: string | null
          provider: string | null
          response_data: Json | null
          status: string
        }
        Insert: {
          amount?: number | null
          approved_at?: string | null
          created_at?: string
          id?: string
          is_extra_charge?: boolean | null
          method?: string | null
          order_id?: string | null
          payment_id?: string | null
          provider?: string | null
          response_data?: Json | null
          status: string
        }
        Update: {
          amount?: number | null
          approved_at?: string | null
          created_at?: string
          id?: string
          is_extra_charge?: boolean | null
          method?: string | null
          order_id?: string | null
          payment_id?: string | null
          provider?: string | null
          response_data?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "cancellation_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          billing_key: string
          card_company: string
          card_number: string
          card_type: string | null
          created_at: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_key: string
          card_company: string
          card_number: string
          card_type?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_key?: string
          card_company?: string
          card_number?: string
          card_type?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      point_settings: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          earning_rate: number
          end_date: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          priority: number
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          earning_rate?: number
          end_date?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          priority?: number
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          earning_rate?: number
          end_date?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          priority?: number
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      point_transactions: {
        Row: {
          admin_user_id: string | null
          amount: number
          balance_after: number
          created_at: string
          description: string
          expired: boolean
          expires_at: string | null
          id: string
          order_id: string | null
          type: Database["public"]["Enums"]["point_transaction_type"]
          user_id: string
        }
        Insert: {
          admin_user_id?: string | null
          amount: number
          balance_after: number
          created_at?: string
          description: string
          expired?: boolean
          expires_at?: string | null
          id?: string
          order_id?: string | null
          type: Database["public"]["Enums"]["point_transaction_type"]
          user_id: string
        }
        Update: {
          admin_user_id?: string | null
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string
          expired?: boolean
          expires_at?: string | null
          id?: string
          order_id?: string | null
          type?: Database["public"]["Enums"]["point_transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "cancellation_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_code_usages: {
        Row: {
          discount_amount: number
          final_amount: number
          id: string
          order_id: string
          original_amount: number
          promotion_code_id: string
          used_at: string
          user_id: string
        }
        Insert: {
          discount_amount: number
          final_amount: number
          id?: string
          order_id: string
          original_amount: number
          promotion_code_id: string
          used_at?: string
          user_id: string
        }
        Update: {
          discount_amount?: number
          final_amount?: number
          id?: string
          order_id?: string
          original_amount?: number
          promotion_code_id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_code_usages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "cancellation_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_code_usages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_code_usages_promotion_code_id_fkey"
            columns: ["promotion_code_id"]
            isOneToOne: false
            referencedRelation: "promotion_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          id: string
          is_active: boolean
          max_discount_amount: number | null
          max_uses: number | null
          max_uses_per_user: number | null
          min_order_amount: number | null
          updated_at: string
          used_count: number
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_order_amount?: number | null
          updated_at?: string
          used_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_order_amount?: number | null
          updated_at?: string
          used_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      repair_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          icon_name: string | null
          id: string
          input_count: number | null
          input_labels: string[] | null
          is_active: boolean
          name: string
          parent_category_id: string | null
          price: number | null
          price_range: string | null
          requires_measurement: boolean | null
          sub_selection_label: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon_name?: string | null
          id?: string
          input_count?: number | null
          input_labels?: string[] | null
          is_active?: boolean
          name: string
          parent_category_id?: string | null
          price?: number | null
          price_range?: string | null
          requires_measurement?: boolean | null
          sub_selection_label?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon_name?: string | null
          id?: string
          input_count?: number | null
          input_labels?: string[] | null
          is_active?: boolean
          name?: string
          parent_category_id?: string | null
          price?: number | null
          price_range?: string | null
          requires_measurement?: boolean | null
          sub_selection_label?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "repair_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_sub_parts: {
        Row: {
          created_at: string
          display_order: number
          icon_name: string | null
          id: string
          name: string
          part_type: string
          price: number | null
          repair_type_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          icon_name?: string | null
          id?: string
          name: string
          part_type?: string
          price?: number | null
          repair_type_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          icon_name?: string | null
          id?: string
          name?: string
          part_type?: string
          price?: number | null
          repair_type_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_sub_parts_repair_type_id_fkey"
            columns: ["repair_type_id"]
            isOneToOne: false
            referencedRelation: "repair_types"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_types: {
        Row: {
          all_option_price: number | null
          allow_multiple_sub_parts: boolean | null
          category_id: string
          created_at: string
          description: string | null
          display_order: number
          has_sub_parts: boolean | null
          icon_name: string | null
          id: string
          input_count: number | null
          input_labels: string[] | null
          is_active: boolean
          name: string
          price: number
          requires_measurement: boolean | null
          requires_multiple_inputs: boolean | null
          show_all_option: boolean
          sub_parts_title: string | null
          updated_at: string
        }
        Insert: {
          all_option_price?: number | null
          allow_multiple_sub_parts?: boolean | null
          category_id: string
          created_at?: string
          description?: string | null
          display_order?: number
          has_sub_parts?: boolean | null
          icon_name?: string | null
          id?: string
          input_count?: number | null
          input_labels?: string[] | null
          is_active?: boolean
          name: string
          price: number
          requires_measurement?: boolean | null
          requires_multiple_inputs?: boolean | null
          show_all_option?: boolean
          sub_parts_title?: string | null
          updated_at?: string
        }
        Update: {
          all_option_price?: number | null
          allow_multiple_sub_parts?: boolean | null
          category_id?: string
          created_at?: string
          description?: string | null
          display_order?: number
          has_sub_parts?: boolean | null
          icon_name?: string | null
          id?: string
          input_count?: number | null
          input_labels?: string[] | null
          is_active?: boolean
          name?: string
          price?: number
          requires_measurement?: boolean | null
          requires_multiple_inputs?: boolean | null
          show_all_option?: boolean
          sub_parts_title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_types_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "repair_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          carrier: Database["public"]["Enums"]["carrier"]
          created_at: string
          customer_name: string
          delivery_address: string
          delivery_address_detail: string | null
          delivery_completed_at: string | null
          delivery_info: Json | null
          delivery_phone: string
          delivery_started_at: string | null
          delivery_tracking_created_at: string | null
          delivery_tracking_no: string | null
          delivery_zipcode: string | null
          id: string
          inbound_video_id: string | null
          island_add_fee: string | null
          notice_cont: string | null
          notify_msg: string | null
          order_id: string
          outbound_video_id: string | null
          pickup_address: string
          pickup_address_detail: string | null
          pickup_completed_at: string | null
          pickup_day_reminder_sent_at: string | null
          pickup_phone: string
          pickup_reminder_sent_at: string | null
          pickup_requested_at: string | null
          pickup_scheduled_date: string | null
          pickup_tracking_no: string | null
          pickup_zipcode: string | null
          refined_address: string | null
          refined_zipcode: string | null
          status: Database["public"]["Enums"]["shipment_status"]
          tracking_events: Json | null
          tracking_no: string
          updated_at: string
        }
        Insert: {
          carrier?: Database["public"]["Enums"]["carrier"]
          created_at?: string
          customer_name: string
          delivery_address: string
          delivery_address_detail?: string | null
          delivery_completed_at?: string | null
          delivery_info?: Json | null
          delivery_phone: string
          delivery_started_at?: string | null
          delivery_tracking_created_at?: string | null
          delivery_tracking_no?: string | null
          delivery_zipcode?: string | null
          id?: string
          inbound_video_id?: string | null
          island_add_fee?: string | null
          notice_cont?: string | null
          notify_msg?: string | null
          order_id: string
          outbound_video_id?: string | null
          pickup_address: string
          pickup_address_detail?: string | null
          pickup_completed_at?: string | null
          pickup_day_reminder_sent_at?: string | null
          pickup_phone: string
          pickup_reminder_sent_at?: string | null
          pickup_requested_at?: string | null
          pickup_scheduled_date?: string | null
          pickup_tracking_no?: string | null
          pickup_zipcode?: string | null
          refined_address?: string | null
          refined_zipcode?: string | null
          status?: Database["public"]["Enums"]["shipment_status"]
          tracking_events?: Json | null
          tracking_no: string
          updated_at?: string
        }
        Update: {
          carrier?: Database["public"]["Enums"]["carrier"]
          created_at?: string
          customer_name?: string
          delivery_address?: string
          delivery_address_detail?: string | null
          delivery_completed_at?: string | null
          delivery_info?: Json | null
          delivery_phone?: string
          delivery_started_at?: string | null
          delivery_tracking_created_at?: string | null
          delivery_tracking_no?: string | null
          delivery_zipcode?: string | null
          id?: string
          inbound_video_id?: string | null
          island_add_fee?: string | null
          notice_cont?: string | null
          notify_msg?: string | null
          order_id?: string
          outbound_video_id?: string | null
          pickup_address?: string
          pickup_address_detail?: string | null
          pickup_completed_at?: string | null
          pickup_day_reminder_sent_at?: string | null
          pickup_phone?: string
          pickup_reminder_sent_at?: string | null
          pickup_requested_at?: string | null
          pickup_scheduled_date?: string | null
          pickup_tracking_no?: string | null
          pickup_zipcode?: string | null
          refined_address?: string | null
          refined_zipcode?: string | null
          status?: Database["public"]["Enums"]["shipment_status"]
          tracking_events?: Json | null
          tracking_no?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "cancellation_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_promotions: {
        Row: {
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_discount_amount: number | null
          min_order_amount: number
          name: string
          type: string
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          min_order_amount?: number
          name: string
          type: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          min_order_amount?: number
          name?: string
          type?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      shipping_settings: {
        Row: {
          base_shipping_fee: number
          id: number
          remote_area_fee: number
          return_shipping_fee: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          base_shipping_fee?: number
          id?: number
          remote_area_fee?: number
          return_shipping_fee?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          base_shipping_fee?: number
          id?: number
          remote_area_fee?: number
          return_shipping_fee?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      staff: {
        Row: {
          auth_id: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          auth_id?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          auth_id?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          auth_id: string | null
          auth_provider: string | null
          created_at: string
          default_address: string | null
          default_address_detail: string | null
          default_zipcode: string | null
          email: string
          fcm_token: string | null
          id: string
          login_provider: string
          marketing_agreed_at: string | null
          name: string
          naver_id: string | null
          phone: string | null
          point_balance: number
          privacy_agreed_at: string | null
          profile_completed: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          terms_agreed_at: string | null
          total_earned_points: number
          total_used_points: number
          updated_at: string
        }
        Insert: {
          auth_id?: string | null
          auth_provider?: string | null
          created_at?: string
          default_address?: string | null
          default_address_detail?: string | null
          default_zipcode?: string | null
          email: string
          fcm_token?: string | null
          id?: string
          login_provider?: string
          marketing_agreed_at?: string | null
          name: string
          naver_id?: string | null
          phone?: string | null
          point_balance?: number
          privacy_agreed_at?: string | null
          profile_completed?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          terms_agreed_at?: string | null
          total_earned_points?: number
          total_used_points?: number
          updated_at?: string
        }
        Update: {
          auth_id?: string | null
          auth_provider?: string | null
          created_at?: string
          default_address?: string | null
          default_address_detail?: string | null
          default_zipcode?: string | null
          email?: string
          fcm_token?: string | null
          id?: string
          login_provider?: string
          marketing_agreed_at?: string | null
          name?: string
          naver_id?: string | null
          phone?: string | null
          point_balance?: number
          privacy_agreed_at?: string | null
          profile_completed?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          terms_agreed_at?: string | null
          total_earned_points?: number
          total_used_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          event_type: string
          id: string
          order_id: string | null
          payment_id: string | null
          process_error: string | null
          processed_at: string | null
          provider: string
          raw: Json
          received_at: string
          signature_ok: boolean | null
        }
        Insert: {
          event_type: string
          id?: string
          order_id?: string | null
          payment_id?: string | null
          process_error?: string | null
          processed_at?: string | null
          provider?: string
          raw: Json
          received_at?: string
          signature_ok?: boolean | null
        }
        Update: {
          event_type?: string
          id?: string
          order_id?: string | null
          payment_id?: string | null
          process_error?: string | null
          processed_at?: string | null
          provider?: string
          raw?: Json
          received_at?: string
          signature_ok?: boolean | null
        }
        Relationships: []
      }
      work_items: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          item_index: number
          item_name: string
          order_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["work_item_status"]
          updated_at: string
          worker_id: string | null
          worker_name: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          item_index: number
          item_name: string
          order_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["work_item_status"]
          updated_at?: string
          worker_id?: string | null
          worker_name?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          item_index?: number
          item_name?: string
          order_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["work_item_status"]
          updated_at?: string
          worker_id?: string | null
          worker_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "cancellation_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      app_version_performance: {
        Row: {
          app_version: string | null
          conversion_rate: number | null
          device_os: string | null
          payment_failure_rate: number | null
          payment_failures: number | null
          purchases: number | null
          total_events: number | null
          total_sessions: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      cancellation_queue: {
        Row: {
          canceled_at: string | null
          cancellation_reason: string | null
          clothing_type: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          extra_charge_data: Json | null
          extra_charge_status:
            | Database["public"]["Enums"]["extra_charge_status"]
            | null
          id: string | null
          item_name: string | null
          order_number: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          queue_kind: string | null
          repair_type: string | null
          status: string | null
          total_price: number | null
          tracking_no: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          canceled_at?: string | null
          cancellation_reason?: string | null
          clothing_type?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          extra_charge_data?: Json | null
          extra_charge_status?:
            | Database["public"]["Enums"]["extra_charge_status"]
            | null
          id?: string | null
          item_name?: string | null
          order_number?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          queue_kind?: never
          repair_type?: string | null
          status?: string | null
          total_price?: number | null
          tracking_no?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          canceled_at?: string | null
          cancellation_reason?: string | null
          clothing_type?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          extra_charge_data?: Json | null
          extra_charge_status?:
            | Database["public"]["Enums"]["extra_charge_status"]
            | null
          id?: string | null
          item_name?: string | null
          order_number?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          queue_kind?: never
          repair_type?: string | null
          status?: string | null
          total_price?: number | null
          tracking_no?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_performance: {
        Row: {
          avg_order_value: number | null
          cohort_conversion_rate: number | null
          cohort_month: string | null
          cohort_size: number | null
          revenue_per_user: number | null
          total_revenue: number | null
          users_with_order: number | null
          users_with_purchase: number | null
        }
        Relationships: []
      }
      cohort_retention_daily: {
        Row: {
          active_users: number | null
          cohort_date: string | null
          cohort_size: number | null
          days_since_first: number | null
          retention_rate: number | null
        }
        Relationships: []
      }
      cohort_retention_weekly: {
        Row: {
          active_users: number | null
          cohort_size: number | null
          cohort_week: string | null
          retention_rate: number | null
          weeks_since_first: number | null
        }
        Relationships: []
      }
      conversion_paths: {
        Row: {
          avg_duration_seconds: number | null
          avg_path_length: number | null
          event_path: string | null
          occurrence_count: number | null
          percentage: number | null
        }
        Relationships: []
      }
      customer_cohorts: {
        Row: {
          cohort_date: string | null
          cohort_month: string | null
          cohort_week: string | null
          first_device_os: string | null
          first_device_type: string | null
          first_event_type:
            | Database["public"]["Enums"]["customer_event_type"]
            | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_segment_analysis: {
        Row: {
          avg_order_value: number | null
          avg_session_duration: number | null
          conversion_rate: number | null
          customer_segment: string | null
          order_starts: number | null
          purchases: number | null
          total_events: number | null
          total_sessions: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      customer_session_summary: {
        Row: {
          app_version: string | null
          device_model: string | null
          device_os: string | null
          device_type: string | null
          duration_seconds: number | null
          event_count: number | null
          has_cart_add: number | null
          has_order_start: number | null
          has_purchase: number | null
          pages_viewed: number | null
          session_end: string | null
          session_id: string | null
          session_start: string | null
          unique_event_types: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_performance: {
        Row: {
          app_opens: number | null
          avg_order_value: number | null
          cart_adds: number | null
          conversion_rate: number | null
          day_name: string | null
          day_of_week: number | null
          order_starts: number | null
          payment_attempts: number | null
          purchases: number | null
          total_events: number | null
          unique_sessions: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      device_performance: {
        Row: {
          avg_order_value: number | null
          avg_session_duration: number | null
          device_os: string | null
          device_type: string | null
          order_conversion_rate: number | null
          payment_failure_rate: number | null
          session_conversion_rate: number | null
          sessions_with_cart: number | null
          sessions_with_order: number | null
          sessions_with_payment: number | null
          sessions_with_purchase: number | null
          total_sessions: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      dropout_paths: {
        Row: {
          avg_events_before_dropout: number | null
          dropout_count: number | null
          last_event_type:
            | Database["public"]["Enums"]["customer_event_type"]
            | null
          last_page: string | null
          percentage: number | null
        }
        Relationships: []
      }
      event_sequences: {
        Row: {
          conversion_rate: number | null
          converted_sessions: number | null
          event_1: Database["public"]["Enums"]["customer_event_type"] | null
          event_2: Database["public"]["Enums"]["customer_event_type"] | null
          event_3: Database["public"]["Enums"]["customer_event_type"] | null
          sequence_count: number | null
        }
        Relationships: []
      }
      hourly_activity_pattern: {
        Row: {
          app_opens: number | null
          cart_adds: number | null
          conversion_rate: number | null
          hour_of_day: number | null
          order_starts: number | null
          purchases: number | null
          total_events: number | null
          unique_sessions: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      media_expiry_status: {
        Row: {
          created_at: string | null
          days_remaining: number | null
          expires_at: string | null
          final_waybill_no: string | null
          id: string | null
          status: string | null
          type: string | null
          video_id: string | null
        }
        Insert: {
          created_at?: string | null
          days_remaining?: never
          expires_at?: string | null
          final_waybill_no?: string | null
          id?: string | null
          status?: never
          type?: string | null
          video_id?: string | null
        }
        Update: {
          created_at?: string | null
          days_remaining?: never
          expires_at?: string | null
          final_waybill_no?: string | null
          id?: string | null
          status?: never
          type?: string | null
          video_id?: string | null
        }
        Relationships: []
      }
      n_day_retention: {
        Row: {
          cohort_date: string | null
          cohort_size: number | null
          retention_day_1: number | null
          retention_day_14: number | null
          retention_day_3: number | null
          retention_day_30: number | null
          retention_day_7: number | null
          returned_day_1: number | null
          returned_day_14: number | null
          returned_day_3: number | null
          returned_day_30: number | null
          returned_day_7: number | null
        }
        Relationships: []
      }
      page_flow: {
        Row: {
          from_page: string | null
          percentage_from_previous: number | null
          to_page: string | null
          transition_count: number | null
        }
        Relationships: []
      }
      page_performance: {
        Row: {
          cart_adds_from_page: number | null
          exit_rate: number | null
          orders_from_page: number | null
          page_title: string | null
          page_url: string | null
          total_views: number | null
          unique_sessions: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      purchase_retention: {
        Row: {
          cohort_date: string | null
          cohort_size: number | null
          repurchase_rate_30d: number | null
          repurchase_rate_60d: number | null
          repurchase_rate_90d: number | null
          repurchased_30d: number | null
          repurchased_60d: number | null
          repurchased_90d: number | null
        }
        Relationships: []
      }
      session_metrics_daily: {
        Row: {
          avg_duration_seconds: number | null
          avg_events_per_session: number | null
          avg_pages_per_session: number | null
          bounce_rate: number | null
          bounce_sessions: number | null
          date: string | null
          session_conversion_rate: number | null
          sessions_with_cart: number | null
          sessions_with_order: number | null
          sessions_with_purchase: number | null
          total_sessions: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      unbounded_retention: {
        Row: {
          cohort_date: string | null
          cohort_size: number | null
          retention_after_day_1: number | null
          retention_after_day_14: number | null
          retention_after_day_3: number | null
          retention_after_day_30: number | null
          retention_after_day_7: number | null
          returned_after_day_1: number | null
          returned_after_day_14: number | null
          returned_after_day_3: number | null
          returned_after_day_30: number | null
          returned_after_day_7: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      approve_extra_charge: {
        Args: {
          p_manager_id: string
          p_note: string
          p_order_id: string
          p_price: number
        }
        Returns: Json
      }
      check_order_limit_status: { Args: never; Returns: Json }
      check_profile_completed: {
        Args: { p_auth_id: string }
        Returns: {
          is_completed: boolean
          missing_fields: string[]
        }[]
      }
      cleanup_expired_media: { Args: never; Returns: number }
      complete_user_profile: {
        Args: {
          p_auth_id: string
          p_marketing_agreed?: boolean
          p_name: string
          p_phone: string
          p_privacy_agreed?: boolean
          p_terms_agreed?: boolean
        }
        Returns: boolean
      }
      create_notification: {
        Args: {
          p_body: string
          p_metadata?: Json
          p_order_id?: string
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: string
      }
      get_all_fcm_tokens: {
        Args: { p_target_audience?: string }
        Returns: {
          email: string
          fcm_token: string
          user_id: string
        }[]
      }
      get_current_point_setting: {
        Args: never
        Returns: {
          earning_rate: number
          end_date: string
          id: string
          name: string
          start_date: string
        }[]
      }
      get_current_user_role: { Args: never; Returns: string }
      get_extra_charge_notification_message: {
        Args: {
          p_extra_charge_status: string
          p_order_number: string
          p_price?: number
        }
        Returns: Json
      }
      get_notification_from_template: {
        Args: { p_template_key: string; p_variables?: Json }
        Returns: Json
      }
      get_notification_message: {
        Args: { p_order_number: string; p_status: string }
        Returns: Json
      }
      get_order_by_id: { Args: { p_order_id: string }; Returns: Json }
      get_today_order_count: { Args: never; Returns: number }
      get_user_id_by_auth_id: {
        Args: { auth_user_id: string }
        Returns: string
      }
      increment_promotion_code_usage: {
        Args: { promo_id: string }
        Returns: undefined
      }
      manage_user_points: {
        Args: {
          p_admin_user_id?: string
          p_amount: number
          p_description: string
          p_expires_at?: string
          p_order_id?: string
          p_type: Database["public"]["Enums"]["point_transaction_type"]
          p_user_id: string
        }
        Returns: string
      }
      mark_all_notifications_as_read: { Args: never; Returns: number }
      mark_announcement_as_read: {
        Args: { p_announcement_id: string; p_user_id: string }
        Returns: boolean
      }
      mark_notification_as_read: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      mark_return_completed: {
        Args: { p_actor_id: string; p_note?: string; p_order_id: string }
        Returns: Json
      }
      process_customer_decision: {
        Args: { p_action: string; p_customer_id: string; p_order_id: string }
        Returns: Json
      }
      register_order_waitlist: {
        Args: { p_fcm_token?: string; p_user_id: string }
        Returns: Json
      }
      request_extra_charge: {
        Args: {
          p_memo: string
          p_note?: string
          p_order_id: string
          p_price?: number
          p_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      action_type:
        | "LOGIN"
        | "LOGOUT"
        | "SCAN_INBOUND"
        | "WORK_START"
        | "WORK_COMPLETE"
        | "REQ_EXTRA_CHARGE"
        | "APPROVE_EXTRA"
        | "REJECT_EXTRA"
        | "SCAN_OUTBOUND"
        | "RETURN_PROCESS"
        | "UPDATE_USER"
        | "DELETE_USER"
      carrier: "EPOST" | "CJ" | "HANJIN" | "LOTTE" | "OTHER"
      clothing_type:
        | "JACKET"
        | "COAT"
        | "PANTS"
        | "SHIRT"
        | "DRESS"
        | "SKIRT"
        | "OTHER"
      customer_event_type:
        | "CART_ADD"
        | "CART_REMOVE"
        | "CART_UPDATE"
        | "CART_CLEAR"
        | "ORDER_START"
        | "ORDER_INFO_FILL"
        | "ORDER_ADDRESS_FILL"
        | "ORDER_PAYMENT_START"
        | "ORDER_PAYMENT_SUCCESS"
        | "ORDER_PAYMENT_FAIL"
        | "ORDER_COMPLETE"
        | "PICKUP_REQUEST_START"
        | "PICKUP_REQUEST_COMPLETE"
        | "PICKUP_REQUEST_CANCEL"
        | "PAGE_VIEW"
        | "PRODUCT_VIEW"
        | "REPAIR_MENU_VIEW"
        | "IMAGE_UPLOAD_START"
        | "IMAGE_UPLOAD_COMPLETE"
        | "PIN_ADD"
        | "PIN_REMOVE"
        | "EXTRA_CHARGE_VIEW"
        | "EXTRA_CHARGE_ACCEPT"
        | "EXTRA_CHARGE_REJECT"
        | "REVIEW_START"
        | "REVIEW_SUBMIT"
        | "APP_OPEN"
        | "APP_CLOSE"
        | "SEARCH"
        | "FILTER_APPLY"
        | "BANNER_CLICK"
        | "NOTIFICATION_CLICK"
      discount_type: "PERCENTAGE" | "FIXED"
      extra_charge_status:
        | "NONE"
        | "PENDING_MANAGER"
        | "PENDING_CUSTOMER"
        | "COMPLETED"
        | "SKIPPED"
        | "RETURN_REQUESTED"
      order_status:
        | "PENDING"
        | "PAID"
        | "BOOKED"
        | "INBOUND"
        | "PROCESSING"
        | "HOLD"
        | "RETURN_PENDING"
        | "RETURN_SHIPPING"
        | "RETURN_DONE"
        | "READY_TO_SHIP"
        | "OUT_FOR_DELIVERY"
        | "DELIVERED"
        | "CANCELLED"
      payment_status:
        | "PENDING"
        | "PAID"
        | "FAILED"
        | "REFUNDED"
        | "CANCELED"
        | "PARTIAL_CANCELED"
      point_transaction_type:
        | "EARNED"
        | "USED"
        | "ADMIN_ADD"
        | "ADMIN_SUB"
        | "EXPIRED"
        | "EARN_CANCEL"
      repair_type: "LENGTH" | "WIDTH" | "ZIPPER" | "BUTTON" | "HOLE" | "OTHER"
      shipment_status:
        | "BOOKED"
        | "PICKED_UP"
        | "IN_TRANSIT"
        | "INBOUND"
        | "PROCESSING"
        | "READY_TO_SHIP"
        | "OUT_FOR_DELIVERY"
        | "DELIVERED"
      user_role: "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "WORKER" | "CUSTOMER"
      work_item_status: "PENDING" | "IN_PROGRESS" | "COMPLETED"
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
      action_type: [
        "LOGIN",
        "LOGOUT",
        "SCAN_INBOUND",
        "WORK_START",
        "WORK_COMPLETE",
        "REQ_EXTRA_CHARGE",
        "APPROVE_EXTRA",
        "REJECT_EXTRA",
        "SCAN_OUTBOUND",
        "RETURN_PROCESS",
        "UPDATE_USER",
        "DELETE_USER",
      ],
      carrier: ["EPOST", "CJ", "HANJIN", "LOTTE", "OTHER"],
      clothing_type: [
        "JACKET",
        "COAT",
        "PANTS",
        "SHIRT",
        "DRESS",
        "SKIRT",
        "OTHER",
      ],
      customer_event_type: [
        "CART_ADD",
        "CART_REMOVE",
        "CART_UPDATE",
        "CART_CLEAR",
        "ORDER_START",
        "ORDER_INFO_FILL",
        "ORDER_ADDRESS_FILL",
        "ORDER_PAYMENT_START",
        "ORDER_PAYMENT_SUCCESS",
        "ORDER_PAYMENT_FAIL",
        "ORDER_COMPLETE",
        "PICKUP_REQUEST_START",
        "PICKUP_REQUEST_COMPLETE",
        "PICKUP_REQUEST_CANCEL",
        "PAGE_VIEW",
        "PRODUCT_VIEW",
        "REPAIR_MENU_VIEW",
        "IMAGE_UPLOAD_START",
        "IMAGE_UPLOAD_COMPLETE",
        "PIN_ADD",
        "PIN_REMOVE",
        "EXTRA_CHARGE_VIEW",
        "EXTRA_CHARGE_ACCEPT",
        "EXTRA_CHARGE_REJECT",
        "REVIEW_START",
        "REVIEW_SUBMIT",
        "APP_OPEN",
        "APP_CLOSE",
        "SEARCH",
        "FILTER_APPLY",
        "BANNER_CLICK",
        "NOTIFICATION_CLICK",
      ],
      discount_type: ["PERCENTAGE", "FIXED"],
      extra_charge_status: [
        "NONE",
        "PENDING_MANAGER",
        "PENDING_CUSTOMER",
        "COMPLETED",
        "SKIPPED",
        "RETURN_REQUESTED",
      ],
      order_status: [
        "PENDING",
        "PAID",
        "BOOKED",
        "INBOUND",
        "PROCESSING",
        "HOLD",
        "RETURN_PENDING",
        "RETURN_SHIPPING",
        "RETURN_DONE",
        "READY_TO_SHIP",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
      ],
      payment_status: [
        "PENDING",
        "PAID",
        "FAILED",
        "REFUNDED",
        "CANCELED",
        "PARTIAL_CANCELED",
      ],
      point_transaction_type: [
        "EARNED",
        "USED",
        "ADMIN_ADD",
        "ADMIN_SUB",
        "EXPIRED",
        "EARN_CANCEL",
      ],
      repair_type: ["LENGTH", "WIDTH", "ZIPPER", "BUTTON", "HOLE", "OTHER"],
      shipment_status: [
        "BOOKED",
        "PICKED_UP",
        "IN_TRANSIT",
        "INBOUND",
        "PROCESSING",
        "READY_TO_SHIP",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
      ],
      user_role: ["SUPER_ADMIN", "ADMIN", "MANAGER", "WORKER", "CUSTOMER"],
      work_item_status: ["PENDING", "IN_PROGRESS", "COMPLETED"],
    },
  },
} as const
