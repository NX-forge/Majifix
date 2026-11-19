# MajiFix user experience

## Navigation

The shared navigation changes based on the signed-in role:

- Administrator and operator: dashboard, water points, fault reports, team, analytics and notifications.
- Technician: dashboard, water points, fault reports, assigned repair jobs and notifications.
- Community: dashboard, water points, fault reports and notifications.
- Guest: log in and registration actions.

Navigation visibility is a usability aid only. Server-side route and record authorization remains mandatory.

## Responsive behavior

- Wide screens use a compact horizontal navigation bar.
- Narrow screens use a slide-in navigation drawer with a backdrop and explicit close control.
- Data tables remain readable through horizontal scrolling rather than compressing critical columns.
- Forms collapse to one column on small screens.
- Dashboard metric cards use a two-column mobile layout.

## Accessibility

- The global skip link moves keyboard and assistive-technology users to the main content.
- The mobile menu button exposes its expanded state and controls the navigation drawer.
- Current links use `aria-current="page"`.
- Focus-visible styles are provided for keyboard navigation.
- Reduced-motion preferences are respected.

## Product language

MajiFix distinguishes repair work completion from restoration confirmation. A repair is not represented as restored until an authorised confirmation is recorded.
