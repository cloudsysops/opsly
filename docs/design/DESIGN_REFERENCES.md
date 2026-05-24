---
status: draft
owner: operations
last_review: 2026-05-24
type: doc
tags:
  - opsly/doc
---

# Opsly Design System

## Overview

The Opsly Design System is a comprehensive collection of design resources, components, and guidelines for building a cohesive AI runtime operating system interface. This document serves as the single source of truth for design references and resources.

## Design Resources

### 1. Claude Design (Source of Truth)

**URL**: [https://claude.ai/design/p/019e12ad-52ab-7464-acfe-2d6da6e12a81](https://claude.ai/design/p/019e12ad-52ab-7464-acfe-2d6da6e12a81)

**Description**: The authoritative design source containing all UI components, design tokens, and visual specifications for Opsly.

**Contents**:
- Complete design system with 10+ artboards
- - Portal Onboarding flows (6-step user journey)
  - - Mission Control Dashboard (admin interface with cyber theme)
    - - Approvals Queue (governance interface)
      - - Costs & Budgets tracking
        - - Sessions detail view
          - - Design tokens and component specifications
           
            - **Access**: All team members with Claude access
           
            - ### 2. Figma Design System
           
            - **URL**: [https://www.figma.com/design/nglbbqdmg98cR7LMYAHRYH/Opsly-Design-System](https://www.figma.com/design/nglbbqdmg98cR7LMYAHRYH/Opsly-Design-System)
           
            - **Description**: Figma project serving as the development reference for implementation by frontend teams.
           
            - **Use Case**: Development reference and component library for engineering teams
           
            - ## Design Specifications
           
            - ### Visual Themes
           
            - Three distinct visual themes for different surfaces:
           
            - #### 1. **Admin Dashboard** - Cyber/Terminal Theme
            - - Color Palette: Ops-Navy (#1a1f3a), Ops-Cyan (#00d9ff), Ops-Magenta (#ff006e)
              - - Typography: Orbitron (headings), Electrolize (labels), JetBrains Mono (code)
                - - Aesthetic: High-contrast, grid-based, cyberpunk operational feel
                  - - Key Surfaces: Mission Control, Approvals Queue, System Health
                   
                    - #### 2. **Portal Interface** - Restrained Terminal Theme
                    - - Color Palette: Ops-Navy, Ops-Cyan (accent), Ops-Purple (#7c3aed)
                      - - Typography: Inter (body), JetBrains Mono (inline code)
                        - - Aesthetic: Clean, minimal, operationally focused
                          - - Key Surfaces: Agent status, Worker management, Session details
                           
                            - #### 3. **Web Marketing** - Brand Theme
                            - - Color Palette: Full Opsly color range for brand presence
                              - - Typography: Electrolize (headings), Inter (body)
                                - - Aesthetic: Professional, modern, SaaS-appropriate
                                  - - Key Surfaces: Landing page, documentation, public-facing content
                                   
                                    - ### Design Tokens
                                   
                                    - **Colors**:
                                    - - `ops-navy`: #1a1f3a
                                      - - `ops-cyan`: #00d9ff
                                        - - `ops-magenta`: #ff006e
                                          - - `ops-purple`: #7c3aed
                                            - - `ops-green`: #10b981
                                              - - `ops-amber`: #f59e0b
                                                - - `ops-red`: #ef4444
                                                 
                                                  - **Typography**:
                                                  - - Orbitron: SF/Serif (headings in admin theme)
                                                    - - Electrolize: Monospace-inspired (labels and tags)
                                                      - - Inter: Sans-serif (body text, UI elements)
                                                        - - JetBrains Mono: Monospace (code, terminal elements)
                                                         
                                                          - **Spacing**: 8px base unit system
                                                          - **Breakpoints**: Mobile (320px), Tablet (768px), Desktop (1024px), Wide (1440px)
                                                         
                                                          - ## Key UI Surfaces
                                                         
                                                          - ### Portal Onboarding (6 Steps)
                                                         
                                                          - 1. **Welcome Screen**: Brand introduction and value proposition
                                                            2. 2. **Agent Connection**: Configure first AI agent/worker
                                                               3. 3. **Runtime Setup**: Initialize runtime environment
                                                                  4. 4. **Permissions**: Set governance and approval rules
                                                                     5. 5. **First Session**: Launch and monitor initial execution
                                                                     6. **Dashboard Overview**: Navigate to main Mission Control

                                                                     ### Mission Control Dashboard

                                                                     **Purpose**: Primary admin interface for system operations

                                                                     **Key Components**:
                                                                     - Session overview grid with status indicators
                                                                     - - Worker health status
                                                                       - - Runtime performance metrics
                                                                         - - Approval queue widget
                                                                           - - Cost allocation dashboard
                                                                             - - System governance controls
                                                                              
                                                                               - ### Approvals Queue
                                                                              
                                                                               - **Purpose**: Governance interface for agent action approval
                                                                              
                                                                               - **Features**:
                                                                               - - Pending approval list
                                                                                 - - Action details and context
                                                                                   - - Risk assessment indicators
                                                                                     - - One-click approve/deny
                                                                                       - - Approval history
                                                                                        
                                                                                         - ### Sessions Detail View
                                                                                        
                                                                                         - **Purpose**: Deep dive into agent session execution
                                                                                        
                                                                                         - **Information**:
                                                                                         - - Session timeline and execution log
                                                                                           - - Resource consumption
                                                                                             - - Worker allocation
                                                                                               - - Step-by-step action trace
                                                                                                 - - Error reporting and recovery
                                                                                                  
                                                                                                   - ## Implementation Guidelines
                                                                                                  
                                                                                                   - ### For Frontend Developers
                                                                                                   - 
                                                                                                   1. **Reference Claude Design** for accurate component specifications
                                                                                                   2. 2. **Use Figma file** as development reference
                                                                                                      3. 3. **Follow design tokens** for consistency
                                                                                                         4. 4. **Maintain theme separation** - don't mix admin/portal/web themes
                                                                                                            5. 5. **Test responsive behavior** across all breakpoints
                                                                                                              
                                                                                                               6. ### Component Library
                                                                                                              
                                                                                                               7. All components are defined in Claude Design with specifications for:
                                                                                                               8. - States (default, hover, active, disabled)
                                                                                                                  - - Responsive behavior
                                                                                                                    - - Accessibility requirements
                                                                                                                    - Dark/light mode support
                                                                                                                    - - Animation specifications
                                                                                                                     
                                                                                                                      - ### Color Usage Guidelines
                                                                                                                     
                                                                                                                      - - **Ops-Cyan**: Primary action buttons, highlights, active states
                                                                                                                        - - **Ops-Magenta**: Critical alerts, important warnings
                                                                                                                          - - **Ops-Navy**: Backgrounds, text, neutral elements
                                                                                                                            - - **Ops-Green**: Success states, positive indicators
                                                                                                                              - - **Ops-Red**: Error states, danger actions
                                                                                                                                - - **Ops-Amber**: Warning states, caution indicators
                                                                                                                                - **Ops-Purple**: Secondary actions, optional elements
                                                                                                                               
                                                                                                                                - ## Handoff Process
                                                                                                                               
                                                                                                                                - ### Design → Development
                                                                                                                               
                                                                                                                                - 1. **Specification Review**: Developers review Claude Design specifications
                                                                                                                                  2. 2. **Component Identification**: Map design components to frontend architecture
                                                                                                                                     3. 3. **Implementation**: Build components following design tokens
                                                                                                                                        4. 4. **QA Review**: Verify against design reference in Figma
                                                                                                                                           5. 5. **Approval**: Design review and sign-off
                                                                                                                                             
                                                                                                                                              6. ### Design Iterations
                                                                                                                                             
                                                                                                                                              7. - New designs created in Claude Design first
                                                                                                                                                 - - Approved designs synced to Figma
                                                                                                                                                   - - Code implementation follows from Figma reference
                                                                                                                                                     - - All changes documented in this file
                                                                                                                                                      
                                                                                                                                                       - ## Design Principles
                                                                                                                                                      
                                                                                                                                                       - 1. **Operational Clarity**: Every element serves a purpose
                                                                                                                                                         2. 2. **High Signal**: Minimal decoration, maximum information density
                                                                                                                                                            3. 3. **Developer-First**: Designed for power users, not casual users
                                                                                                                                                               4. 4. **Runtime-Native**: UI reinforces Opsly runtime concepts (sessions, workers, governance)
                                                                                                                                                                  5. 5. **Cybernetic**: Visual language reflects autonomous systems control
                                                                                                                                                                     6. 6. **Accessible**: WCAG 2.1 AA compliance across all interfaces
                                                                                                                                                                       
                                                                                                                                                                        7. ## Design Quality Standards
                                                                                                                                                                       
                                                                                                                                                                        8. ✅ **Must Have**:
                                                                                                                                                                        9. - Consistent typography hierarchy
                                                                                                                                                                           - - Color contrast ratio ≥ 4.5:1 for text
                                                                                                                                                                             - - 8px grid alignment
                                                                                                                                                                               - - Keyboard navigation support
                                                                                                                                                                                 - - Mobile responsive at all breakpoints
                                                                                                                                                                                  
                                                                                                                                                                                   - ✅ **Should Have**:
                                                                                                                                                                                   - - Accessible color indicators (not color-only)
                                                                                                                                                                                     - - Focus states for all interactive elements
                                                                                                                                                                                       - - Microinteractions for key actions
                                                                                                                                                                                         - - Loading states for async operations
                                                                                                                                                                                           - - Empty states with guidance
                                                                                                                                                                                            
                                                                                                                                                                                             - ✅ **Nice to Have**:
                                                                                                                                                                                             - - Smooth transitions and animations
                                                                                                                                                                                               - - Hover previews
                                                                                                                                                                                                 - - Undo/redo functionality
                                                                                                                                                                                                   - - Progressive disclosure patterns
                                                                                                                                                                                                     - - Dark mode support
                                                                                                                                                                                                      
                                                                                                                                                                                                       - ## Maintenance
                                                                                                                                                                                                      
                                                                                                                                                                                                       - ### Keeping Resources Synchronized
                                                                                                                                                                                                      
                                                                                                                                                                                                       - 1. **Primary Source**: Claude Design is the source of truth
                                                                                                                                                                                                         2. 2. **Sync Point**: Approved designs pushed to Figma weekly
                                                                                                                                                                                                            3. 3. **Version Control**: All design changes documented here
                                                                                                                                                                                                               4. 4. **Review Cycle**: Design reviews before implementation
                                                                                                                                                                                                                 
                                                                                                                                                                                                                  5. ### Contributing
                                                                                                                                                                                                                 
                                                                                                                                                                                                                  6. To contribute design improvements:
                                                                                                                                                                                                                 
                                                                                                                                                                                                                  7. 1. Open issue or discussion in GitHub
                                                                                                                                                                                                                     2. 2. Create proposal in Claude Design
                                                                                                                                                                                                                        3. 3. Gather team feedback
                                                                                                                                                                                                                           4. 4. Update Figma reference
                                                                                                                                                                                                                              5. 5. Document changes in this file
                                                                                                                                                                                                                                 6. 6. Commit to `docs/design/` folder
                                                                                                                                                                                                                                   
                                                                                                                                                                                                                                    7. ## Related Documentation
                                                                                                                                                                                                                                   
                                                                                                                                                                                                                                    8. - **Product Strategy**: `/docs/PRODUCT_STRATEGY.md`
                                                                                                                                                                                                                                       - - **Architecture**: `/docs/00-architecture/`
                                                                                                                                                                                                                                         - - **Development**: `/docs/01-development/`
                                                                                                                                                                                                                                           - - **Agent Documentation**: `/docs/03-agents/`
                                                                                                                                                                                                                                            
                                                                                                                                                                                                                                             - ## Current Status
                                                                                                                                                                                                                                            
                                                                                                                                                                                                                                             - ✅ **Complete**:
                                                                                                                                                                                                                                             - - Design system foundation
                                                                                                                                                                                                                                               - - Visual theme specifications
                                                                                                                                                                                                                                                 - - Component definitions
                                                                                                                                                                                                                                                   - - Onboarding flows
                                                                                                                                                                                                                                                     - - Dashboard layouts
                                                                                                                                                                                                                                                      
                                                                                                                                                                                                                                                       - 🚧 **In Progress**:
                                                                                                                                                                                                                                                       - - Component implementation in React
                                                                                                                                                                                                                                                       - Responsive testing
                                                                                                                                                                                                                                                       - Accessibility audit
                                                                                                                                                                                                                                                       - - Performance optimization
                                                                                                                                                                                                                                                        
                                                                                                                                                                                                                                                         - 📋 **Planned**:
                                                                                                                                                                                                                                                         - - Animation library
                                                                                                                                                                                                                                                           - - Storybook documentation
                                                                                                                                                                                                                                                           - Design system automation
                                                                                                                                                                                                                                                           - - Design tokens in code
                                                                                                                                                                                                                                                             - 
                                                                                                                                                                                                                                                             ## Questions?
                                                                                                                                                                                                                                                             
                                                                                                                                                                                                                                                             For design system questions or contributions, please:
                                                                                                                                                                                                                                                             1. Check Claude Design for specifications
                                                                                                                                                                                                                                                             2. 2. Review Figma for implementation reference
                                                                                                                                                                                                                                                             3. Open a GitHub discussion
                                                                                                                                                                                                                                                             4. 4. Reach out to the design team in Slack
                                                                                                                                                                                                                                                               
                                                                                                                                                                                                                                                                5. ---
                                                                                                                                                                                                                                                               
                                                                                                                                                                                                                                                                6. **Last Updated**: May 2026
                                                                                                                                                                                                                                                                7. **Design System Version**: 1.0
                                                                                                                                                                                                                                                                8. **Status**: Active & Maintained

---

## Enlaces relacionados

- [[brain/README|brain]]
- [[brain/README|Brain Central]]
