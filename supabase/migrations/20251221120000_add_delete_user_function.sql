-- Create a secure function to delete users (only for admins)
CREATE OR REPLACE FUNCTION public.delete_user_account(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  -- Prevent admin from deleting themselves
  IF user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  -- Delete user from auth (this will cascade delete profiles, files, folders, etc.)
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;
