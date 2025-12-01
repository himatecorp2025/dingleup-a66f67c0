-- Drop and recreate the export function with fixed approach
DROP FUNCTION IF EXISTS public.generate_full_database_export();

CREATE OR REPLACE FUNCTION public.generate_full_database_export()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result TEXT := '';
  v_table_record RECORD;
  v_column_record RECORD;
  v_row_json JSONB;
  v_create_statement TEXT;
  v_columns_list TEXT;
  v_insert_statement TEXT;
  v_values TEXT;
  v_value TEXT;
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

    -- Generate CREATE TABLE statement
    v_create_statement := 'CREATE TABLE IF NOT EXISTS public.' || quote_ident(v_table_record.tablename) || E' (\n';
    v_columns_list := '';

    FOR v_column_record IN
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        column_default,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = v_table_record.tablename
      ORDER BY ordinal_position
    LOOP
      IF v_columns_list != '' THEN
        v_columns_list := v_columns_list || E',\n';
      END IF;

      v_columns_list := v_columns_list || '  ' || quote_ident(v_column_record.column_name) || ' ';
      
      -- Add data type
      IF v_column_record.character_maximum_length IS NOT NULL THEN
        v_columns_list := v_columns_list || v_column_record.data_type || '(' || v_column_record.character_maximum_length || ')';
      ELSE
        v_columns_list := v_columns_list || v_column_record.data_type;
      END IF;

      -- Add nullable constraint
      IF v_column_record.is_nullable = 'NO' THEN
        v_columns_list := v_columns_list || ' NOT NULL';
      END IF;

      -- Add default value
      IF v_column_record.column_default IS NOT NULL THEN
        v_columns_list := v_columns_list || ' DEFAULT ' || v_column_record.column_default;
      END IF;
    END LOOP;

    v_create_statement := v_create_statement || v_columns_list || E'\n);\n\n';
    v_result := v_result || v_create_statement;

    -- Generate INSERT statements for all rows using JSON approach
    FOR v_row_json IN EXECUTE format('SELECT row_to_json(t) FROM (SELECT * FROM public.%I) t', v_table_record.tablename)
    LOOP
      v_insert_statement := 'INSERT INTO public.' || quote_ident(v_table_record.tablename) || ' (';
      v_columns_list := '';
      v_values := '';

      FOR v_column_record IN
        SELECT column_name
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
        
        -- Get value from JSON
        v_value := v_row_json->>v_column_record.column_name;

        IF v_value IS NULL THEN
          v_values := v_values || 'NULL';
        ELSE
          v_values := v_values || quote_literal(v_value);
        END IF;
      END LOOP;

      v_insert_statement := v_insert_statement || v_columns_list || ') VALUES (' || v_values || E');\n';
      v_result := v_result || v_insert_statement;
    END LOOP;

    v_result := v_result || E'\n';
  END LOOP;

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users (admin check is inside function)
GRANT EXECUTE ON FUNCTION public.generate_full_database_export() TO authenticated;