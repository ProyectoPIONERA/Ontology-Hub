#!/usr/bin/env bash
set -e

patterns_script="/app/Patterns/Patrones/generate_web_page.py"

if [ -f "$patterns_script" ]; then
  sed -i \
    -e 's/images_path_name, images_path_name, images_path_type/images_path_name, images_path_type/' \
    -e 's/generate_documentation(styles_path, patterns_type_path, inferred_blank_nodes_path, images_path_type, web_path, patterns_name_path, inferred_type_path)/generate_documentation(styles_path, patterns_type_path, inferred_blank_nodes_path, images_path_name, images_path_type, web_path, patterns_name_path, inferred_type_path)/' \
    -e 's/generate_documentation(styles_path, patterns_type_path, inferred_blank_nodes_path, images_path_name, web_path, patterns_name_path, inferred_type_path)/generate_documentation(styles_path, patterns_type_path, inferred_blank_nodes_path, images_path_name, images_path_type, web_path, patterns_name_path, inferred_type_path)/' \
    "$patterns_script"

  test "$(grep -c 'images_path_name, images_path_type, web_path, patterns_name_path' "$patterns_script")" -eq 3
fi

exec bash /app/setup/start.sh
