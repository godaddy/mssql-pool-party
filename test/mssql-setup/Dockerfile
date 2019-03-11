FROM microsoft/mssql-server-linux:latest

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Bundle app source
COPY . /usr/src/app

# Grant permissions for the scripts to be executable
RUN chmod +x /usr/src/app/entrypoint.sh
RUN chmod +x /usr/src/app/import-data.sh

RUN echo 'export "PATH=$PATH:/opt/mssql-tools/bin"' >> /root/.bashrc

ENTRYPOINT [ "/usr/src/app/entrypoint.sh" ]
