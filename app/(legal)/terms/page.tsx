import styles from '../legal.module.css';
import { Footer } from '@/components';
import Link from 'next/link';

export const metadata = {
  title: '서비스 이용약관 - 노베이스구조대',
};

export default function TermsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>
          ← 홈으로
        </Link>
      </header>
      
      <main className={styles.main}>
        <article className={styles.content}>
          <h1 className={styles.title}>서비스 이용약관</h1>
          <p className={styles.lastUpdated}>최종 수정일: 2025년 12월 24일</p>

          <section className={styles.section}>
            <h2>제1조 (목적)</h2>
            <p>이 약관은 도텍(이하 &quot;회사&quot;)이 운영하는 노베이스구조대 서비스(이하 &quot;서비스&quot;)의 이용조건 및 절차, 회사와 회원 간의 권리, 의무 및 책임사항 등을 규정함을 목적으로 합니다.</p>
          </section>

          <section className={styles.section}>
            <h2>제2조 (정의)</h2>
            <ol>
              <li>&quot;서비스&quot;란 회사가 제공하는 온라인 교육 플랫폼 및 관련 제반 서비스를 의미합니다.</li>
              <li>&quot;회원&quot;이란 회사와 서비스 이용계약을 체결하고 회원 아이디를 부여받은 자를 의미합니다.</li>
              <li>&quot;콘텐츠&quot;란 서비스 내에서 제공되는 강의 영상, 자료, 텍스트 등 모든 정보를 의미합니다.</li>
            </ol>
          </section>

          <section className={styles.section}>
            <h2>제3조 (약관의 효력 및 변경)</h2>
            <ol>
              <li>이 약관은 서비스를 이용하고자 하는 모든 회원에 대하여 그 효력을 발생합니다.</li>
              <li>회사는 필요한 경우 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지사항을 통해 공지합니다.</li>
              <li>회원이 변경된 약관에 동의하지 않을 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.</li>
            </ol>
          </section>

          <section className={styles.section}>
            <h2>제4조 (회원가입)</h2>
            <ol>
              <li>회원가입은 이용자가 약관의 내용에 동의한 후 회원가입 신청을 하고, 회사가 이를 승낙함으로써 체결됩니다.</li>
              <li>회사는 다음 각 호에 해당하는 신청에 대해서는 승낙을 하지 않을 수 있습니다.
                <ul>
                  <li>타인의 명의를 도용한 경우</li>
                  <li>허위 정보를 기재한 경우</li>
                  <li>기타 회원으로 등록하는 것이 적절하지 않다고 판단되는 경우</li>
                </ul>
              </li>
            </ol>
          </section>

          <section className={styles.section}>
            <h2>제5조 (서비스의 제공)</h2>
            <ol>
              <li>회사는 다음과 같은 서비스를 제공합니다.
                <ul>
                  <li>온라인 강의 서비스</li>
                  <li>학습 자료 제공</li>
                  <li>학습 진도 관리</li>
                  <li>기타 회사가 정하는 서비스</li>
                </ul>
              </li>
              <li>서비스는 연중무휴, 1일 24시간 제공을 원칙으로 합니다. 단, 시스템 점검 등의 사유로 일시 중단될 수 있습니다.</li>
            </ol>
          </section>

          <section className={styles.section}>
            <h2>제6조 (유료 서비스)</h2>
            <ol>
              <li>회사는 일부 서비스를 유료로 제공할 수 있습니다.</li>
              <li>유료 서비스의 결제 방법, 이용 기간 등은 해당 서비스 페이지에 별도로 안내합니다.</li>
              <li>결제 취소 및 환불은 관련 법령 및 회사의 환불 정책에 따릅니다.</li>
            </ol>
          </section>

          <section className={styles.section}>
            <h2>제7조 (회원의 의무)</h2>
            <ol>
              <li>회원은 다음 행위를 하여서는 안 됩니다.
                <ul>
                  <li>타인의 정보 도용</li>
                  <li>회사가 제공하는 콘텐츠의 무단 복제, 배포, 전송</li>
                  <li>회사 및 제3자의 지적재산권 침해</li>
                  <li>회사 및 제3자의 명예를 훼손하거나 업무를 방해하는 행위</li>
                  <li>외설 또는 폭력적인 내용의 게시</li>
                  <li>기타 불법적이거나 부당한 행위</li>
                </ul>
              </li>
              <li>회원은 계정 정보를 안전하게 관리할 책임이 있습니다.</li>
            </ol>
          </section>

          <section className={styles.section}>
            <h2>제8조 (저작권)</h2>
            <ol>
              <li>서비스 내의 모든 콘텐츠에 대한 저작권은 회사에 귀속됩니다.</li>
              <li>회원은 서비스를 통해 얻은 정보를 회사의 사전 승낙 없이 복제, 전송, 출판, 배포, 방송 등의 방법으로 이용하거나 제3자에게 제공할 수 없습니다.</li>
            </ol>
          </section>

          <section className={styles.section}>
            <h2>제9조 (서비스 이용 제한)</h2>
            <p>회사는 회원이 본 약관의 의무를 위반하거나 서비스의 정상적인 운영을 방해한 경우, 서비스 이용을 제한하거나 회원 자격을 상실시킬 수 있습니다.</p>
          </section>

          <section className={styles.section}>
            <h2>제10조 (책임의 제한)</h2>
            <ol>
              <li>회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중단 등 불가항력으로 인해 서비스를 제공할 수 없는 경우 책임이 면제됩니다.</li>
              <li>회사는 회원의 귀책사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.</li>
            </ol>
          </section>

          <section className={styles.section}>
            <h2>제11조 (분쟁 해결)</h2>
            <ol>
              <li>회사와 회원 간에 발생한 분쟁에 관한 소송은 회사의 본사 소재지를 관할하는 법원을 전속관할로 합니다.</li>
              <li>회사와 회원 간의 분쟁에는 대한민국 법률을 적용합니다.</li>
            </ol>
          </section>

          <section className={styles.section}>
            <h2>부칙</h2>
            <p>이 약관은 2025년 12월 24일부터 시행됩니다.</p>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
}
