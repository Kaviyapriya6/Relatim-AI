-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.ai_chats (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  prompt text NOT NULL,
  response text NOT NULL,
  conversation_context jsonb,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ai_chats_pkey PRIMARY KEY (id),
  CONSTRAINT ai_chats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.calls (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  caller_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  call_type character varying NOT NULL CHECK (call_type::text = ANY (ARRAY['voice'::character varying, 'video'::character varying]::text[])),
  status USER-DEFINED DEFAULT 'initiated'::call_status,
  room_id character varying,
  started_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  ended_at timestamp without time zone,
  duration integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT calls_pkey PRIMARY KEY (id),
  CONSTRAINT calls_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(id),
  CONSTRAINT calls_caller_id_fkey FOREIGN KEY (caller_id) REFERENCES public.users(id)
);
CREATE TABLE public.contacts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  nickname character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT contacts_pkey PRIMARY KEY (id),
  CONSTRAINT contacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT contacts_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.users(id)
);
CREATE TABLE public.message_read_status (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  delivered_at timestamp without time zone,
  seen_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT message_read_status_pkey PRIMARY KEY (id),
  CONSTRAINT message_read_status_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT message_read_status_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  content text,
  file_url text,
  file_type character varying,
  file_name character varying,
  file_size integer,
  status USER-DEFINED DEFAULT 'sent'::message_status,
  is_deleted_for_sender boolean DEFAULT false,
  is_deleted_for_receiver boolean DEFAULT false,
  is_deleted_for_everyone boolean DEFAULT false,
  reply_to_message_id uuid,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_reply_to_message_id_fkey FOREIGN KEY (reply_to_message_id) REFERENCES public.messages(id),
  CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id)
);
CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  endpoint text NOT NULL,
  p256dh_key text NOT NULL,
  auth_key text NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.typing_indicators (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  is_typing boolean DEFAULT false,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT typing_indicators_pkey PRIMARY KEY (id),
  CONSTRAINT typing_indicators_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT typing_indicators_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.users(id)
);
CREATE TABLE public.user_settings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  dark_mode boolean DEFAULT false,
  notifications_enabled boolean DEFAULT true,
  message_preview boolean DEFAULT true,
  last_backup timestamp without time zone,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  sound_enabled boolean DEFAULT true,
  read_receipts boolean DEFAULT true,
  last_seen_enabled boolean DEFAULT true,
  online_status_enabled boolean DEFAULT true,
  typing_indicators boolean DEFAULT true,
  auto_download character varying DEFAULT 'wifi'::character varying,
  language character varying DEFAULT 'en'::character varying,
  font_size character varying DEFAULT 'medium'::character varying,
  two_factor_enabled boolean DEFAULT false,
  two_factor_secret text,
  backup_codes ARRAY,
  CONSTRAINT user_settings_pkey PRIMARY KEY (id),
  CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  first_name character varying NOT NULL,
  last_name character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  phone_number character varying NOT NULL UNIQUE,
  password_hash text NOT NULL,
  profile_photo text,
  is_online boolean DEFAULT false,
  last_seen timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  bio text,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);