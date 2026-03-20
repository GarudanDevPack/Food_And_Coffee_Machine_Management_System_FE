import Image from 'next/image'
import Link from 'next/link'
import logoImg from '@/assets/images/logo-qfox.png'
import logoSmImg from '@/assets/images/logo-qfox-sm.png'

const LogoBox = () => {
  return (
    <Link href="/" className="logo">
      <span className="logo-light">
        <span className="logo-lg">
          <Image width={120} height={36} src={logoImg} alt="QFOX logo" style={{ objectFit: 'contain' }} />
        </span>
        <span className="logo-sm">
          <Image width={36} height={36} src={logoSmImg} alt="QFOX" style={{ objectFit: 'contain' }} />
        </span>
      </span>
      <span className="logo-dark">
        <span className="logo-lg">
          <Image width={120} height={36} src={logoImg} alt="QFOX logo" style={{ objectFit: 'contain' }} />
        </span>
        <span className="logo-sm">
          <Image width={36} height={36} src={logoSmImg} alt="QFOX" style={{ objectFit: 'contain' }} />
        </span>
      </span>
    </Link>
  )
}

export default LogoBox
