-- =============================================================================
-- Diagnostic helper: lets the app see what Postgres thinks about the current
-- session (auth.uid(), auth.role(), JWT claims). Useful when an INSERT fails
-- with "row-level security policy" because it tells us whether auth.uid() is
-- NULL (= no valid JWT seen by Postgres) or a different value than expected.
-- =============================================================================

create or replace function public.whoami()
returns json
language sql
stable
as $$
  select json_build_object(
    'uid',  auth.uid(),
    'role', auth.role(),
    'has_jwt', (auth.jwt() is not null)
  );
$$;

grant execute on function public.whoami() to anon, authenticated;
