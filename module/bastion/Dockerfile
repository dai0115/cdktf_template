FROM amazonlinux:2

WORKDIR /go/app

RUN yum update -y && yum install -y tee wget curl unzip git jq awscli shadow-utils htop lsof telnet bind-utils yum-utils && \
    rpm --import https://repo.mysql.com/RPM-GPG-KEY-mysql-2022 && \
    yum install -y yum localinstall https://dev.mysql.com/get/mysql80-community-release-el7-3.noarch.rpm && \
    yum-config-manager --enable mysql80-community && \
    yum-config-manager --disable mysql57-community && \
    yum install -y mysql-community-client && \
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip -u awscliv2.zip && \
    ./aws/install --bin-dir /usr/local/bin --install-dir /usr/local/aws-cli --update

CMD ["sleep", "3600"]