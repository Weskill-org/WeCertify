-- Migration: Add stored functions for administrator issuer management

-- 1. List users and roles for administrators
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role public.app_role,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email::text,
    COALESCE(u.raw_user_meta_data->>'full_name', '')::text AS full_name,
    ur.role,
    u.created_at
  FROM auth.users u
  JOIN public.user_roles ur ON ur.user_id = u.id
  ORDER BY u.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

-- 2. Create new issuer
CREATE OR REPLACE FUNCTION public.admin_create_issuer(
  _email text,
  _password text,
  _full_name text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  _new_id uuid := gen_random_uuid();
  _clean_email text := lower(trim(_email));
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.';
  END IF;

  IF _clean_email = '' OR _clean_email NOT LIKE '%@%.%' THEN
    RAISE EXCEPTION 'Invalid email address.';
  END IF;

  IF length(_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters.';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = _clean_email) THEN
    RAISE EXCEPTION 'A user with this email address already exists.';
  END IF;

  -- 1. Insert into auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_sso_user,
    is_anonymous,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    _new_id,
    'authenticated',
    'authenticated',
    _clean_email,
    crypt(_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', trim(_full_name), 'email_verified', true),
    false,
    false,
    now(),
    now()
  );

  -- 2. Insert into auth.identities
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    _new_id,
    jsonb_build_object('sub', _new_id::text, 'email', _clean_email, 'email_verified', true, 'full_name', trim(_full_name)),
    'email',
    _new_id::text,
    now(),
    now(),
    now()
  );

  -- 3. Insert into public.user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_new_id, 'issuer');

  RETURN _new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_issuer(text, text, text) TO authenticated;

-- 3. Update existing issuer
CREATE OR REPLACE FUNCTION public.admin_update_issuer(
  _user_id uuid,
  _email text,
  _full_name text DEFAULT '',
  _new_password text DEFAULT NULL,
  _role public.app_role DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  _clean_email text := lower(trim(_email));
  _current_email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.';
  END IF;

  SELECT email INTO _current_email FROM auth.users WHERE id = _user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found.';
  END IF;

  IF _clean_email = '' OR _clean_email NOT LIKE '%@%.%' THEN
    RAISE EXCEPTION 'Invalid email address.';
  END IF;

  -- If changing email, ensure it's not already used by another account
  IF _clean_email <> _current_email AND EXISTS (SELECT 1 FROM auth.users WHERE email = _clean_email AND id <> _user_id) THEN
    RAISE EXCEPTION 'A user with this email address already exists.';
  END IF;

  -- If updating password, ensure min length and hash
  IF _new_password IS NOT NULL AND trim(_new_password) <> '' THEN
    IF length(trim(_new_password)) < 6 THEN
      RAISE EXCEPTION 'Password must be at least 6 characters.';
    END IF;
    UPDATE auth.users
    SET encrypted_password = crypt(trim(_new_password), gen_salt('bf'))
    WHERE id = _user_id;
  END IF;

  -- Update email and metadata in auth.users
  UPDATE auth.users
  SET 
    email = _clean_email,
    raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{full_name}',
      to_jsonb(trim(_full_name))
    ),
    updated_at = now()
  WHERE id = _user_id;

  -- Update identity in auth.identities
  UPDATE auth.identities
  SET 
    identity_data = jsonb_build_object('sub', _user_id::text, 'email', _clean_email, 'email_verified', true, 'full_name', trim(_full_name)),
    updated_at = now()
  WHERE user_id = _user_id AND provider = 'email';

  -- Update role in public.user_roles if provided
  IF _role IS NOT NULL THEN
    IF _user_id = auth.uid() AND _role <> 'admin' THEN
      RAISE EXCEPTION 'You cannot remove your own administrator role.';
    END IF;
    UPDATE public.user_roles
    SET role = _role
    WHERE user_id = _user_id;
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_issuer(uuid, text, text, text, public.app_role) TO authenticated;

-- 4. Delete issuer
CREATE OR REPLACE FUNCTION public.admin_delete_issuer(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.';
  END IF;

  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot delete your own account.';
  END IF;

  IF public.has_role(_user_id, 'admin') THEN
    RAISE EXCEPTION 'Administrators cannot be deleted.';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _user_id;
  DELETE FROM auth.identities WHERE user_id = _user_id;
  DELETE FROM auth.users WHERE id = _user_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_issuer(uuid) TO authenticated;
