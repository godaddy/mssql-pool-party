FROM microsoft/mssql-server-linux:latest

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Bundle app source
COPY . /usr/src/app

# Grant permissions for the import-data script to be executable
RUN chmod +x /usr/src/app/import-data.sh

RUN echo 'export "PATH=$PATH:/opt/mssql-tools/bin"' >> /root/.bashrc

CMD /bin/bash ./entrypoint.sh
