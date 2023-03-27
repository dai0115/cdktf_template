FROM amazonlinux:2
ENV ARCH="linux_x86_64"
RUN yum install -y sudo jq awscli shadow-utils htop lsof telnet bind-utils yum-utils && \
    rpm --import https://repo.mysql.com/RPM-GPG-KEY-mysql-2022 && \
    yum install -y https://s3.ap-northeast-1.amazonaws.com/amazon-ssm-ap-northeast-1/latest/${ARCH}/amazon-ssm-agent.rpm && \
    yum install -y yum localinstall https://dev.mysql.com/get/mysql80-community-release-el7-3.noarch.rpm && \
    yum install -y mysql-community-client && \
    adduser ssm-user && echo "ssm-user ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/ssm-agent-users && \
    mv /etc/amazon/ssm/amazon-ssm-agent.json.template /etc/amazon/ssm/amazon-ssm-agent.json && \
    mv /etc/amazon/ssm/seelog.xml.template /etc/amazon/ssm/seelog.xml
COPY run.sh /run.sh
CMD ["sh", "/run.sh"]
