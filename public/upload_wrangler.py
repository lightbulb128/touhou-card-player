import os

wrangler_upload_command = "npx wrangler r2 object put {bucket_name}/{object_key} --file {file_path} --remote"
bucket_name = "touhou-card-player"

subfolders = [
  "cards",
  "cards-dairi",
  "cards-enbu",
  "cards-enbu-dolls",
  "cards-thwiki",
  "cards-zun"
]

def upload(bucket_name, subfolder) -> list[str]:
  r = []
  for dirpath, dirnames, filenames in os.walk(f"public/{subfolder}"):
    for filename in filenames:
      file_path = os.path.join(dirpath, filename).replace("\\", "/")
      object_key = os.path.relpath(file_path, "public").replace("\\", "/")
      command = wrangler_upload_command.format(
        bucket_name=bucket_name,
        object_key=object_key,
        file_path=file_path
      )
      r.append(command)
  return r

rs = []
for subfolder in subfolders:
  rs.extend(upload(bucket_name, subfolder))

# run first 10 commands for testing
for command in rs:
  print(command)
  os.system(command)