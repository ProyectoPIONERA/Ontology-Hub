
#!/usr/bin/env bash
set -euo pipefail

# =========================
# Settings (edit as needed)
# =========================
JENA_VERSION="2.7.4"
FUSEKI_VERSION="1.1.1"

BASE_DIR="/app/jena"
JENA_HOME="${BASE_DIR}/apache-jena-${JENA_VERSION}"
FUSEKI_HOME="${BASE_DIR}/jena-fuseki-${FUSEKI_VERSION}"
FUSEKI_BASE="${BASE_DIR}/fuseki-base"          # runtime area (logs/config/databases)
TDB_DIR="${BASE_DIR}/tdb_lov_db"               # TDB1 target
CONFIG_TTL="${BASE_DIR}/config-lov.ttl"        # your Fuseki assembler/config (optional)
LOV_NQ="/app/public/lov.nq"                    # input data
DATASET_NAME="/lov"                            # published dataset path
FUSEKI_LOG="${FUSEKI_HOME}/fuseki.log"
FORCE_RELOAD="${FORCE_RELOAD:-false}"          # set true to rebuild TDB even if files exist

# Env file to persist variables (root -> /etc; non-root -> $HOME)
ENV_FILE="/etc/jena-fuseki.env"
if [[ $EUID -ne 0 ]]; then
  ENV_FILE="${HOME}/.jena-fuseki.env"
fi

# Helper: print step headers
step() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }

# -------------------------
# 0) Preflight checks
# -------------------------
step "Preflight checks"
command -v wget >/dev/null || { echo "Missing 'wget'"; exit 1; }
command -v tar  >/dev/null || { echo "Missing 'tar'"; exit 1; }
command -v pkill >/dev/null || { echo "Missing 'pkill'"; exit 1; }
command -v curl >/dev/null || { echo "Missing 'curl'"; exit 1; }

mkdir -p "${BASE_DIR}" "${FUSEKI_BASE}"/{logs,configuration,backups,databases} "${TDB_DIR}"

# -------------------------
# 1) Download / extract Jena (if missing)
# -------------------------
if [[ -x "${JENA_HOME}/bin/sparql" ]]; then
  step "Jena already present at ${JENA_HOME} — skipping download."
else
  step "Downloading and extracting Apache Jena ${JENA_VERSION}"
  wget -O "${BASE_DIR}/apache-jena.tar.gz" \
    "https://archive.apache.org/dist/jena/binaries/apache-jena-${JENA_VERSION}.tar.gz"
  tar -xzf "${BASE_DIR}/apache-jena.tar.gz" -C "${BASE_DIR}"
  rm -f "${BASE_DIR}/apache-jena.tar.gz"
fi

# -------------------------
# 2) Download / extract Fuseki (if missing)
# -------------------------
if [[ -x "${FUSEKI_HOME}/fuseki-server" ]]; then
  step "Fuseki already present at ${FUSEKI_HOME} — skipping download."
else
  step "Downloading and extracting Jena Fuseki ${FUSEKI_VERSION}"
  wget -O "${BASE_DIR}/jena-fuseki.tar.gz" \
    "https://archive.apache.org/dist/jena/binaries/jena-fuseki-${FUSEKI_VERSION}-distribution.tar.gz"
  tar -xzf "${BASE_DIR}/jena-fuseki.tar.gz" -C "${BASE_DIR}"
  rm -f "${BASE_DIR}/jena-fuseki.tar.gz"
fi

# -------------------------
# 3) Copy config into Fuseki directory (if provided)
# -------------------------
if [[ -f "${CONFIG_TTL}" ]]; then
  step "Copying config: ${CONFIG_TTL} -> ${FUSEKI_HOME}/"
  cp -f "${CONFIG_TTL}" "${FUSEKI_HOME}/"
else
  echo "WARNING: Config file not found at ${CONFIG_TTL}. Continuing."
fi

# -------------------------
# 4) Persist envs and export them NOW (works for non-login shells)
# -------------------------
step "Persisting environment variables to ${ENV_FILE}"

cat > "${ENV_FILE}" <<EOF
JENA_HOME="${JENA_HOME}"
FUSEKI_HOME="${FUSEKI_HOME}"
FUSEKI_BASE="${FUSEKI_BASE}"
# Prepend Jena tools to PATH
PATH="\${JENA_HOME}/bin:\${PATH}"
EOF

# Export them for the current shell (so the rest of this script sees them)
set -a
. "${ENV_FILE}"
set +a

# Additionally, for login shells (root only), source the env file automatically
if [[ $EUID -eq 0 && -d /etc/profile.d ]]; then
  step "Linking env file into /etc/profile.d for login shells"
  cat > /etc/profile.d/jena-fuseki.sh <<'EOS'
[ -f /etc/jena-fuseki.env ] && set -a && . /etc/jena-fuseki.env && set +a
EOS
  chmod 0644 /etc/profile.d/jena-fuseki.sh
fi

# Quick verification in this shell:
echo "JENA_HOME=${JENA_HOME}"
echo "FUSEKI_HOME=${FUSEKI_HOME}"
echo "FUSEKI_BASE=${FUSEKI_BASE}"
command -v sparql >/dev/null || echo "WARN: 'sparql' not on PATH (check ${ENV_FILE})"

# -------------------------
# 5) Load data into TDB only if needed
# -------------------------
LOAD_NEEDED=true
if [[ "${FORCE_RELOAD}" == "true" ]]; then
  LOAD_NEEDED=true
else
  # If TDB directory has any TDB1 files, assume already loaded
  if find "${TDB_DIR}" -type f \( -name "*.dat" -o -name "*.idn" -o -name "*.opt" -o -name "*.jrnl" \) | grep -q .; then
    LOAD_NEEDED=false
  fi
fi

if [[ "${LOAD_NEEDED}" == "true" ]]; then
  step "Loading data into TDB with tdbloader2"
  if [[ ! -f "${LOV_NQ}" ]]; then
    echo "ERROR: Input file not found: ${LOV_NQ}"
    exit 1
  fi
  "${JENA_HOME}/bin/tdbloader2" --loc "${TDB_DIR}" "${LOV_NQ}"
else
  step "TDB directory already has data — skipping load. (Set FORCE_RELOAD=true to rebuild)"
fi

# -------------------------
# 6) Stop any running Fuseki
# -------------------------
step "Stopping any existing Fuseki process"
pkill -f "fuseki-server" || true
sleep 1

# -------------------------
# 7) Start Fuseki in background with logs (robust)
# -------------------------
step "Starting Fuseki (TDB1) at http://localhost:3030${DATASET_NAME}"

# Important: start from the Fuseki distribution directory to avoid 'can't find jar' errors
cd "${FUSEKI_HOME}"

UPDATE_FLAG="--update"  # change to "" if you want read-only
# If you prefer to use your assembler config, swap --loc for: --desc "${FUSEKI_HOME}/config-lov.ttl"
nohup ./fuseki-server --tdb1 --loc "${TDB_DIR}" ${UPDATE_FLAG} "${DATASET_NAME}" \
  > "${FUSEKI_LOG}" 2>&1 &

# -------------------------
# 8) Health check
# -------------------------
step "Health check"
for i in {1..20}; do
  if curl -fsS "http://localhost:3030/" >/dev/null; then
    echo "Fuseki is up. Log: ${FUSEKI_LOG}"
    exit 0
  fi
  sleep 1
done

echo "WARNING: Fuseki did not respond on http://localhost:3030 after 20s."
echo "Check logs at ${FUSEKI_LOG}"
exit 0
