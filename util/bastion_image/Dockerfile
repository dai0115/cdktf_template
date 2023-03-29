FROM amazonlinux:2

RUN yum update -y && yum install -y curl git jq awscli shadow-utils htop lsof telnet bind-utils yum-utils && \
    rpm --import https://repo.mysql.com/RPM-GPG-KEY-mysql-2022 && \
    yum install -y yum localinstall https://dev.mysql.com/get/mysql80-community-release-el7-3.noarch.rpm && \
    yum-config-manager --enable mysql80-community && \
    yum-config-manager --disable mysql57-community && \
    yum install -y mysql-community-client

CMD ["sleep", "3600"]