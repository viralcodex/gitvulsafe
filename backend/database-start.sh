DB_CONTAINER_NAME="dephound-postgres"

if ! [ -x "$(command -v docker)" ]; then
  echo "Error: Docker is not installed." >&2
  exit 1
fi

if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker and try again." >&2
    exit 1
fi

if [ "$(docker ps -q -f name=$DB_CONTAINER_NAME)" ]; then
    echo "Database container '$DB_CONTAINER_NAME' already running"
  exit 0
fi

if [ "$(docker ps -q -a -f name=$DB_CONTAINER_NAME)" ]; then
    echo "Database container '$DB_CONTAINER_NAME' already exists. Starting the container..."
    docker start $DB_CONTAINER_NAME
    echo "Database container '$DB_CONTAINER_NAME' started."
    exit 0
fi


#Start a new Postgres container
set -a

source .env

DB_PASSWORD=$(echo "$DATABASE_URL" | awk -F':' '{print $3}' | awk -F'@' '{print $1}')
DB_PORT=$(echo "$DATABASE_URL" | awk -F':' '{print $4}' | awk -F'\/' '{print $1}')

if [ "$DB_PASSWORD" = "password" ]; then
    echo "Default Password Detected."
    read -p "Want to generate a random password? (y/n): " -r yn
    if [[ $yn =~ ^[Yy]$ ]]; then
        DB_PASSWORD=$(openssl rand -base64 12 | tr '+/' '-_')
        echo "Generated Password: $DB_PASSWORD"
    else
        read -sp "Enter your desired Postgres password: " DB_PASSWORD
        echo
    fi
    sed -i -e "s#:password@#:$DB_PASSWORD@#" .env
fi

docker run -d \
  --name $DB_CONTAINER_NAME \
  -e POSTGRES_USER=dephound \
  -e POSTGRES_PASSWORD=$DB_PASSWORD \
  -e POSTGRES_DB=dephound \
  -p $DB_PORT:5432 \
  docker.io/postgres:15-alpine && echo "Database container '$DB_CONTAINER_NAME' successfully started."