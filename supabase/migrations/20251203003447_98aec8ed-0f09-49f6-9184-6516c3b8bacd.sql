-- Create RPC function to get table column types from information_schema
CREATE OR REPLACE FUNCTION public.get_table_column_types(p_table_name TEXT)
RETURNS TABLE(column_name TEXT, data_type TEXT, udt_name TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.column_name::TEXT,
    c.data_type::TEXT,
    c.udt_name::TEXT
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = p_table_name
  ORDER BY c.ordinal_position;
$$;