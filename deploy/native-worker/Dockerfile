ARG WORKER_BASE=mcr.microsoft.com/dotnet/aspnet:10.0-noble
FROM ${WORKER_BASE}
WORKDIR /worker
COPY . /worker/
USER 0:1654
ENV DOTNET_EnableDiagnostics=0 ASPNETCORE_URLS=""
ENTRYPOINT ["dotnet", "GarminFaceCreator.SimulatorWorker.dll"]
