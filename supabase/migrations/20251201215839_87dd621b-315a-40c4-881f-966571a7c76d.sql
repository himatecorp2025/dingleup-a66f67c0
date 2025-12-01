-- Drop and recreate the export function with timeout handling and optimization
DROP FUNCTION IF EXISTS public.generate_full_database_export();

CREATE OR REPLACE FUNCTION public.generate_full_database_export()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '120s'  -- Give it 2 minutes to complete
AS $$
DECLARE
  v_result TEXT := '';
  v_table_record RECORD;
  v_column_record RECORD;
  v_row_record RECORD;
  v_create_statement TEXT;
  v_columns_list TEXT;
  v_insert_statement TEXT;
  v_values TEXT;
  v_value TEXT;
  v_row_count INTEGER := 0;
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;

  v_result := '-- DingleUP! Full Database Export' || E'\n';
  v_result := v_result || '-- Generated at: ' || NOW()::TEXT || E'\n';
  v_result := v_result || '-- Database: public schema' || E'\n\n';

  -- Loop through all tables in public schema
  FOR v_table_record IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY tablename
  LOOP
    v_result := v_result || E'\n-- ================================================\n';
    v_result := v_result || '-- Table: ' || v_table_record.tablename || E'\n';
    v_result := v_result || E'-- ================================================\n\n';

    -- Generate CREATE TABLE statement (simplified - just table name)
    v_result := v_result || '-- CREATE TABLE public.' || quote_ident(v_table_record.tablename) || E';\n\n';

    -- Generate INSERT statements for all rows
    v_row_count := 0;
    FOR v_row_record IN EXECUTE format('SELECT * FROM public.%I', v_table_record.tablename)
    LOOP
      v_insert_statement := 'INSERT INTO public.' || quote_ident(v_table_record.tablename) || ' (';
      v_columns_list := '';
      v_values := '';

      FOR v_column_record IN
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = v_table_record.tablename
        ORDER BY ordinal_position
      LOOP
        IF v_columns_list != '' THEN
          v_columns_list := v_columns_list || ', ';
          v_values := v_values || ', ';
        END IF;

        v_columns_list := v_columns_list || quote_ident(v_column_record.column_name);
        
        -- Get value using dynamic approach
        EXECUTE format('SELECT ($1).%I::TEXT', v_column_record.column_name) 
          USING v_row_record INTO v_value;

        IF v_value IS NULL THEN
          v_values := v_values || 'NULL';
        ELSE
          v_values := v_values || quote_literal(v_value);
        END IF;
      END LOOP;

      v_insert_statement := v_insert_statement || v_columns_list || ') VALUES (' || v_values || E');\n';
      v_result := v_result || v_insert_statement;
      
      v_row_count := v_row_count + 1;
    END LOOP;

    v_result := v_result || E'\n-- ' || v_row_count || ' rows exported from ' || v_table_record.tablename || E'\n\n';
  END LOOP;

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users (admin check is inside function)
GRANT EXECUTE ON FUNCTION public.generate_full_database_export() TO authenticated;